const mongoose = require("mongoose");
const User = require("../models/user.model");
const whatsappService = require("./whatsapp.service");
const sessionStore = require("../utils/sessionStore");
const { addRowToSheet } = require("./googleSheets.service");
const { buscarAsesoraPorTelefono } = require("../data/asesoras");
const {
  parseNaturalDate,
  formatDateForUser,
} = require("../utils/dateParser");
const {
  normalizeServiceSelection,
  normalizeConfirmation,
  isValidPhone,
  isValidName,
  normalizeLocationSelection,
} = require("../utils/messageParser");
const { DateTime } = require("luxon");

const LIMA_TIMEZONE = 'America/Lima';

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

async function getOrCreateUser(from) {
  if (isMongoConnected()) {
    let user = await User.findOne({ phoneNumber: from });
    if (!user) {
      user = new User({ phoneNumber: from });
      await user.save();
    }
    return user;
  } else {
    let session = sessionStore.getSession(from);
    if (!session) {
      session = sessionStore.createSession(from);
    }
    return session;
  }
}

async function saveUser(user) {
  if (isMongoConnected()) {
    await user.save();
  } else {
    sessionStore.updateSession(user.phoneNumber, user);
  }
}

function resetUserConversation(user) {
  if (isMongoConnected()) {
    user.resetConversation();
  } else {
    sessionStore.resetSession(user.phoneNumber);
    user.state = "INITIAL";
    user.selectedLocation = null;
    user.selectedService = null;
    user.servicePrice = null;
    user.collectedPhone = null;
    user.appointmentDate = null;
    user.parsedAppointmentDate = null;
    user.name = null;
  }
}

async function processMessage(from, text, messageId) {
  try {
    let user = await getOrCreateUser(from);
    user.lastMessageAt = new Date();

    await whatsappService.markAsRead(messageId);

    switch (user.state) {
      case "INITIAL":
        await handleInitialState(user);
        break;

      case "WAITING_LOCATION":
        await handleLocationSelection(user, text);
        break;

      case "WAITING_SERVICE":
        await handleServiceSelection(user, text);
        break;

      case "WAITING_NAME":
        await handleNameInput(user, text);
        break;

      case "WAITING_PHONE":
        await handlePhoneInput(user, text);
        break;

      case "WAITING_CONFIRMATION":
        await handleConfirmation(user, text);
        break;

      case "WAITING_DATE":
        await handleDateInput(user, text);
        break;

      case "COMPLETED":
        await handleCompletedState(user, text);
        break;

      default:
        await handleInitialState(user);
    }

    await saveUser(user);
  } catch (error) {
    console.error("Error processing message:", error);
    await whatsappService.sendMessage(
      from,
      'Lo siento, ocurrió un error. Por favor, intenta nuevamente enviando "Hola".'
    );
  }
}

async function handleInitialState(user) {
  const welcomeMessage = `👋 ¡Hola! Bienvenida al sistema de registro de citas.

¿En qué local deseas registrar la cita de la clienta?

a) Los Olivos
b) Trujillo
c) Arequipa
d) Chimbote
e) Pucallpa
f) Medellín
g) Chico
h) Chapinero
i) Los Leones
j) Providencia
k) Lince
l) Luxury
m) Mor
n) Luxury Envigado
ñ) Itagüí
Por favor, responde con la letra o el nombre del local.`;

  await whatsappService.sendMessage(user.phoneNumber, welcomeMessage);
  user.state = "WAITING_LOCATION";
}

async function handleLocationSelection(user, text) {
  const location = normalizeLocationSelection(text);

  if (!location) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, selecciona un local válido:\n\n"
        + "a) Los Olivos\n"
        + "b) Trujillo\n"
        + "c) Arequipa\n"
        + "d) Chimbote\n"
        + "e) Pucallpa\n"
        + "f) Medellín\n"
        + "g) Chico\n"
        + "h) Chapinero\n"
        + "i) Los Leones\n"
        + "j) Providencia\n"
        + "k) Lince\n"
        + "l) Luxury\n"
        + "m) Mor\n"
        + "n) Luxury Envigado\n"
        + "ñ) Itagüí"
    );
    return;
  }

  user.selectedLocation = location;
  user.state = "WAITING_SERVICE";

  const serviceMessage = `Perfecto, local seleccionado: *${location}*.

¿Qué servicio se realizará la clienta?

1️⃣ Alisado
2️⃣ Bioplastia
3️⃣ Botox
4️⃣ Color
5️⃣ Corte
6️⃣ Laceado
  
Por favor, responde con el número o el nombre del servicio.`;

  await whatsappService.sendMessage(user.phoneNumber, serviceMessage);
}

async function handleServiceSelection(user, text) {
  const result = normalizeServiceSelection(text);

  if (!result) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, selecciona una opción válida:\n\n1️⃣ Alisado\n2️⃣ Bioplastia\n3️⃣ Botox\n4️⃣ Color\n5️⃣ Corte\n6️⃣ Laceado"
    );
    return;
  }

  user.selectedService = result.service;
  user.state = "WAITING_NAME";

  await whatsappService.sendMessage(
    user.phoneNumber,
    `Servicio seleccionado: *${result.service}*\n\nPor favor, ingresa el *nombre completo de la clienta*.`
  );
}

async function handleNameInput(user, text) {
  if (!isValidName(text)) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, ingresa un nombre válido (solo letras y espacios)."
    );
    return;
  }

  user.name = text.trim();
  user.state = "WAITING_PHONE";

  await whatsappService.sendMessage(
    user.phoneNumber,
    `Nombre registrado: ${user.name}\n\nAhora ingresa el *número de teléfono de la clienta*.`
  );
}

async function handlePhoneInput(user, text) {
  if (!isValidPhone(text)) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, ingresa un número de teléfono válido (7-15 dígitos)."
    );
    return;
  }

  user.collectedPhone = text.trim();
  user.state = "WAITING_CONFIRMATION";

  const confirmationMessage = `Perfecto. Verifica los datos de la clienta:

📋 *Resumen de la información:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}

¿Los datos son correctos? (Sí / No)`;

  await whatsappService.sendMessage(user.phoneNumber, confirmationMessage);
}

async function handleConfirmation(user, text) {
  const isConfirmed = normalizeConfirmation(text);

  if (isConfirmed === null) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      'Por favor, responde con "Sí" o "No".'
    );
    return;
  }

  if (!isConfirmed) {
    resetUserConversation(user);
    user.state = "WAITING_LOCATION";
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Entendido. Vamos a empezar de nuevo.\n\n¿En qué local deseas registrar la cita?\n\n"
        + "a) Los Olivos\n"
        + "b) Trujillo\n"
        + "c) Arequipa\n"
        + "d) Chimbote\n"
        + "e) Pucallpa\n"
        + "f) Medellín\n"
        + "g) Chico\n"
        + "h) Chapinero\n"
        + "i) Los Leones\n"
        + "j) Providencia\n"
        + "k) Lince\n"
        + "l) Luxury\n"
        + "m) Mor\n"
        + "n) Luxury Envigado\n"
        + "ñ) Itagüí"
    );
    return;
  }

  user.state = "WAITING_DATE";
  await whatsappService.sendMessage(
    user.phoneNumber,
    '¡Perfecto! 📅\n\nAhora ingresa la *fecha y hora de la cita*.\n\nEjemplos:\n- "15 de enero a las 3:00 PM"\n- "mañana a las 10:00 AM"\n- "sábado a las 2:00 PM"'
  );
}

async function handleDateInput(user, text) {
  const parsedDate = parseNaturalDate(text);

  if (!parsedDate) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      'No pude entender esa fecha. Por favor, intenta de nuevo.\n\nEjemplos:\n- "mañana a las 4 PM"\n- "sábado a las 10:00"\n- "5 de noviembre a las 3:00 PM"'
    );
    return;
  }

  const nowLima = DateTime.now().setZone(LIMA_TIMEZONE);
  const parsedLima = DateTime.fromJSDate(parsedDate).setZone(LIMA_TIMEZONE);
  const diffMinutes = parsedLima.diff(nowLima, 'minutes').minutes;

  console.log('🔍 Validando fecha en flow.service (Lima):', {
    fechaActual: nowLima.toFormat('yyyy-MM-dd HH:mm:ss'),
    fechaParseada: parsedLima.toFormat('yyyy-MM-dd HH:mm:ss'),
    diferenciaMinutos: Math.round(diffMinutes),
    esFutura: diffMinutes > 0,
  });

  if (diffMinutes < 0) {
    console.log('❌ Fecha rechazada - está en el pasado');
    await whatsappService.sendMessage(
      user.phoneNumber,
      "La fecha debe ser en el futuro. Por favor, ingresa una fecha válida."
    );
    return;
  }

  user.appointmentDate = text.trim();
  user.parsedAppointmentDate = parsedDate;

  const formattedDate = formatDateForUser(parsedDate);

  console.log('💾 Guardando cita en Google Sheets...');

  try {
    const parsedLimaDateTime = DateTime.fromJSDate(parsedDate).setZone(LIMA_TIMEZONE);
    const horaFormateada = parsedLimaDateTime.toFormat('hh:mm a');
    const fechaFormateada = parsedLimaDateTime.toFormat('dd/MM/yyyy');

    // Buscar información de la asesora
    const asesoraInfo = buscarAsesoraPorTelefono(user.phoneNumber);
    
    const result = await addRowToSheet({
      local: user.selectedLocation,
      nombre: user.name,
      telefono: user.collectedPhone,
      servicio: user.selectedService,
      precio: '',
      fecha: fechaFormateada,
      hora: horaFormateada,
      estado: 'Confirmado',
      nombreAsesora: asesoraInfo ? asesoraInfo.nombre : '',
      apellidoAsesora: asesoraInfo ? asesoraInfo.apellido : '',
      telefonoAsesor: user.phoneNumber,
    });

    if (!result.success) {
      console.error("❌ Fallo al guardar cita en Google Sheets:", result.error);
      user.state = "COMPLETED";
      await saveUser(user);
      await whatsappService.sendMessage(
        user.phoneNumber,
        `⚠️ La cita fue registrada pero hubo un problema al guardar en Google Sheets.\n\n📋 *Datos de la cita:*\n\n📍 Local: ${user.selectedLocation}\n👤 Nombre: ${user.name}\n📞 Teléfono: ${user.collectedPhone}\n💅 Servicio: ${user.selectedService}\n📅 Fecha y hora: ${formattedDate}\n\n⚠️ Por favor, registra manualmente en la hoja de cálculo.\n\nPara registrar otra cita, envía "Hola".`
      );
      return;
    }

    console.log('✅ Cita guardada exitosamente en Google Sheets');
  } catch (error) {
    console.error("❌ Error crítico al guardar cita en Google Sheets:", error);
    user.state = "COMPLETED";
    await saveUser(user);
    await whatsappService.sendMessage(
      user.phoneNumber,
      `⚠️ Hubo un error al guardar en Google Sheets.\n\n📋 *Datos de la cita:*\n\n📍 Local: ${user.selectedLocation}\n👤 Nombre: ${user.name}\n📞 Teléfono: ${user.collectedPhone}\n💅 Servicio: ${user.selectedService}\n📅 Fecha y hora: ${formattedDate}\n\n⚠️ Por favor, registra manualmente en la hoja de cálculo.\n\nPara registrar otra cita, envía "Hola".`
    );
    return;
  }

  user.state = "COMPLETED";
  await saveUser(user);

  console.log('✅ Estado del usuario actualizado a COMPLETED');

  const confirmationMessage = `✅ ¡Cita registrada exitosamente!

📋 *Resumen de la cita registrada:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
📅 Fecha y hora: ${formattedDate}

La cita ha sido guardada en Google Sheets.

Para registrar otra cita, envía "Hola".`;

  try {
    await whatsappService.sendMessage(user.phoneNumber, confirmationMessage);
    console.log('✅ Mensaje de confirmación enviado');
  } catch (err) {
    console.error('❌ Error al enviar mensaje de confirmación:', err.response?.data || err.message);
  }
}

async function handleCompletedState(user, text) {
  const normalized = text.trim().toLowerCase();

  if (
    normalized.includes("hola") ||
    normalized.includes("nueva") ||
    normalized.includes("otra")
  ) {
    resetUserConversation(user);
    await handleInitialState(user);
  } else {
    await whatsappService.sendMessage(
      user.phoneNumber,
      'La cita ya fue registrada. Para registrar otra cita, envía "Hola".'
    );
  }
}

module.exports = {
  processMessage,
};
