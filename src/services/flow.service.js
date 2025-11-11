const mongoose = require("mongoose");
const User = require("../models/user.model");
const whatsappService = require("./whatsapp.service");
const sessionStore = require("../utils/sessionStore");
const { addRowToSheet } = require("./googleSheets.service");
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

// REFACTOR NOTE: Removed all Google Calendar integration
// - Removed googleAuthService import
// - Removed createCalendarDateTime import
// - Removed WAITING_CALENDAR state handling
// - Flow now goes: Date confirmation → Save to Sheets → Completed

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

// REFACTOR NOTE: Changed message from customer-facing to advisor-facing
async function handleInitialState(user) {
  const welcomeMessage = `👋 ¡Hola! Bienvenida al sistema de registro de citas.

¿En qué local deseas registrar la cita de la clienta?

1️⃣ Chimbote
2️⃣ Trujillo
3️⃣ Olivos
4️⃣ Arequipa
5️⃣ Lince
6️⃣ Pucallpa

7️⃣ Bogota
8️⃣ Luxury
9️⃣ Medellin
🔟 Chapineros
1️⃣1️⃣ Los Leones
1️⃣2️⃣ Providencia

Por favor, responde con el número o el nombre del local.`;

  await whatsappService.sendMessage(user.phoneNumber, welcomeMessage);
  user.state = "WAITING_LOCATION";
}

async function handleLocationSelection(user, text) {
  const location = normalizeLocationSelection(text);

  if (!location) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, selecciona un local válido:\n\n1️⃣ Chimbote\n2️⃣ Trujillo\n3️⃣ Olivos\n4️⃣ Arequipa\n5️⃣ Lince\n6️⃣ Pucallpa\n7️⃣ Bogota\n8️⃣ Luxury\n9️⃣ Medellin\n🔟 Chapineros\n1️⃣1️⃣ Los Leones\n1️⃣2️⃣ Providencia"
    );
    return;
  }

  user.selectedLocation = location;
  user.state = "WAITING_SERVICE";

  // REFACTOR NOTE: Changed to advisor-facing language
  const serviceMessage = `Perfecto, local seleccionado: *${location}*.

¿Qué servicio se realizará la clienta?

1️⃣ Alisado
2️⃣ Laceado
3️⃣ Color

Por favor, responde con el número o el nombre del servicio.`;

  await whatsappService.sendMessage(user.phoneNumber, serviceMessage);
}

async function handleServiceSelection(user, text) {
  const result = normalizeServiceSelection(text);

  if (!result) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, selecciona una opción válida:\n\n1️⃣ Alisado\n2️⃣ Laceado\n3️⃣ Color"
    );
    return;
  }

  user.selectedService = result.service;
  user.state = "WAITING_NAME";

  // REFACTOR NOTE: Changed to advisor-facing language
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

  // REFACTOR NOTE: Changed to advisor-facing language
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

  // REFACTOR NOTE: Changed to advisor-facing language
  const confirmationMessage = `Perfecto. Verifica los datos de la clienta:

📋 *Resumen de la información:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
💵 Precio: S/${user.servicePrice}

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
      "Entendido. Vamos a empezar de nuevo.\n\n¿En qué local deseas registrar la cita?\n\n1️⃣ Chimbote\n2️⃣ Trujillo\n3️⃣ Olivos\n4️⃣ Arequipa\n5️⃣ Lince\n6️⃣ Pucallpa"
    );
    return;
  }

  user.state = "WAITING_DATE";
  // REFACTOR NOTE: Changed to advisor-facing language
  await whatsappService.sendMessage(
    user.phoneNumber,
    '¡Perfecto! 📅\n\nAhora ingresa la *fecha y hora de la cita*.\n\nEjemplos:\n- "15 de enero a las 3:00 PM"\n- "mañana a las 10:00 AM"\n- "sábado a las 2:00 PM"'
  );
}

// REFACTOR NOTE: Completely refactored - no longer asks about Google Calendar
// Now saves directly to Google Sheets after date confirmation
async function handleDateInput(user, text) {
  const parsedDate = parseNaturalDate(text);

  if (!parsedDate) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      'No pude entender esa fecha. Por favor, intenta de nuevo.\n\nEjemplos:\n- "mañana a las 4 PM"\n- "sábado a las 10:00"\n- "5 de noviembre a las 3:00 PM"'
    );
    return;
  }

  if (parsedDate < new Date()) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "La fecha debe ser en el futuro. Por favor, ingresa una fecha válida."
    );
    return;
  }

  user.appointmentDate = text.trim();
  user.parsedAppointmentDate = parsedDate;

  const formattedDate = formatDateForUser(parsedDate);

  // REFACTOR NOTE: Save to Google Sheets immediately after date confirmation
  // No Google Calendar integration anymore
  try {
    const horaFormateada = user.parsedAppointmentDate
      ? user.parsedAppointmentDate.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";
    const fechaFormateada = user.parsedAppointmentDate
      ? user.parsedAppointmentDate.toLocaleDateString("es-PE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "";
    
    const result = await addRowToSheet({
      local: user.selectedLocation,
      nombre: user.name,
      telefono: user.collectedPhone,
      servicio: user.selectedService,
      precio: "",
      fecha: fechaFormateada,
      hora: horaFormateada,
      estado: "Confirmado",
    });

    if (!result.success) {
      console.error("❌ Fallo al guardar cita en Google Sheets:", result.error);
      user.state = "COMPLETED";
      
      // REFACTOR NOTE: Changed to advisor-facing language
      await whatsappService.sendMessage(
        user.phoneNumber,
        `⚠️ La cita fue registrada pero hubo un problema al guardar en Google Sheets.\n\n📋 *Datos de la cita:*\n\n📍 Local: ${user.selectedLocation}\n👤 Nombre: ${user.name}\n📞 Teléfono: ${user.collectedPhone}\n💅 Servicio: ${user.selectedService}\n📅 Fecha y hora: ${formattedDate}\n\n⚠️ Por favor, registra manualmente en la hoja de cálculo.\n\nPara registrar otra cita, envía "Hola".`
      );
      return;
    }
  } catch (error) {
    console.error("❌ Error al guardar cita en Google Sheets:", error);
  }

  user.state = "COMPLETED";

  // REFACTOR NOTE: Changed to advisor-facing language - removed Calendar mention
  const confirmationMessage = `✅ ¡Cita registrada exitosamente!

📋 *Resumen de la cita registrada:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
📅 Fecha y hora: ${formattedDate}

La cita ha sido guardada en Google Sheets.

Para registrar otra cita, envía "Hola".`;

  await whatsappService.sendMessage(user.phoneNumber, confirmationMessage);
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
    // REFACTOR NOTE: Changed to advisor-facing language
    await whatsappService.sendMessage(
      user.phoneNumber,
      'La cita ya fue registrada. Para registrar otra cita, envía "Hola".'
    );
  }
}

module.exports = {
  processMessage,
};
