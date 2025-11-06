const mongoose = require("mongoose");
const User = require("../models/user.model");
const whatsappService = require("./whatsapp.service");
const sessionStore = require("../utils/sessionStore");
const googleAuthService = require("./googleAuth.service");
const { addRowToSheet } = require("./googleSheets.service");
const {
  parseNaturalDate,
  formatDateForUser,
  createCalendarDateTime,
} = require("../utils/dateParser");
const {
  normalizeServiceSelection,
  normalizeConfirmation,
  isValidPhone,
  isValidName,
  normalizeLocationSelection,
} = require("../utils/messageParser");

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

      case "WAITING_CALENDAR":
        await handleCalendarChoice(user, text);
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
  const welcomeMessage = `👋 ¡Hola! Bienvenido al centro de reservas.

¿En qué local deseas agendar tu cita?

1️⃣ Chimbote
2️⃣ Trujillo
3️⃣ Olivos
4️⃣ Arequipa
5️⃣ Lince
6️⃣ Pucallpa

Por favor, responde con el número o el nombre del local.`;

  await whatsappService.sendMessage(user.phoneNumber, welcomeMessage);
  user.state = "WAITING_LOCATION";
}

async function handleLocationSelection(user, text) {
  const location = normalizeLocationSelection(text);

  if (!location) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, selecciona un local válido:\n\n1️⃣ Chimbote\n2️⃣ Trujillo\n3️⃣ Olivos\n4️⃣ Arequipa\n5️⃣ Lince\n6️⃣ Pucallpa"
    );
    return;
  }

  user.selectedLocation = location;
  user.state = "WAITING_SERVICE";

  const serviceMessage = `Perfecto, has seleccionado el local de *${location}*.

¿Qué servicio deseas realizarte hoy?

1️⃣ Botox - S/100
2️⃣ Bioplastia reconstructora - S/150
3️⃣ Bioplastia organica - S/200
4️⃣ Bioplastia Top Láser - S/250
5️⃣ Semipermanente - S/300
6️⃣ Dual - S/300

Por favor, responde con el número o el nombre del servicio.`;

  await whatsappService.sendMessage(user.phoneNumber, serviceMessage);
}

async function handleServiceSelection(user, text) {
  const result = normalizeServiceSelection(text);

  if (!result) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, selecciona una opción válida:\n\n1️⃣ Botox - S/100\n2️⃣ Bioplastia reconstructora - S/150\n3️⃣ Bioplastia organica - S/200\n4️⃣ Bioplastia Top Láser - S/250\n5️⃣ Semipermanente - S/300\n6️⃣ Dual - S/300"
    );
    return;
  }

  user.selectedService = result.service;
  user.servicePrice = result.price;
  user.state = "WAITING_NAME";

  await whatsappService.sendMessage(
    user.phoneNumber,
    `Perfecto, has seleccionado: *${result.service}* - S/${result.price}\n\n¿Cuál es tu nombre completo?`
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
    `Gracias, ${user.name}.\n\n¿Cuál es tu número de teléfono de contacto?`
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

  const confirmationMessage = `Gracias, estos son tus datos:

📋 *Resumen de tu información:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
💵 Precio: S/${user.servicePrice}

¿Están correctos estos datos? (Sí / No)`;

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
      "Entendido. Vamos a empezar de nuevo.\n\n¿En qué local deseas agendar tu cita?\n\n1️⃣ Chimbote\n2️⃣ Trujillo\n3️⃣ Olivos\n4️⃣ Arequipa\n5️⃣ Lince\n6️⃣ Pucallpa"
    );
    return;
  }

  user.state = "WAITING_DATE";
  await whatsappService.sendMessage(
    user.phoneNumber,
    '¡Excelente! 📅\n\nPor favor, indícame la fecha y hora que prefieres para tu cita.\n\nEjemplo: "15 de enero a las 3:00 PM" o "2024-01-15 15:00"'
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

  if (isMongoConnected()) {
    user.state = "WAITING_CALENDAR";
    await whatsappService.sendMessage(
      user.phoneNumber,
      `Perfecto, tu cita será el *${formattedDate}*.\n\n¿Deseas agregar esta cita a tu Google Calendar? 📅\n\nResponde *Sí* o *No*.`
    );
  } else {
    user.state = "COMPLETED";
    const confirmationMessage = `🎉 ¡Tu cita ha sido agendada exitosamente!

📋 *Detalles de tu cita:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
💵 Precio: S/${user.servicePrice}
📅 Fecha y hora: ${formattedDate}

Te esperamos, ${user.name}. ¡Gracias por confiar en nosotros!

Si necesitas hacer otra reserva, envía "Hola" nuevamente.`;

    await whatsappService.sendMessage(user.phoneNumber, confirmationMessage);
  }
}

async function handleCalendarChoice(user, text) {
  const wantsCalendar = normalizeConfirmation(text);

  if (wantsCalendar === null) {
    await whatsappService.sendMessage(
      user.phoneNumber,
      "Por favor, responde *Sí* o *No* para agregar la cita a tu Google Calendar."
    );
    return;
  }

  user.wantsCalendarIntegration = wantsCalendar;

  // 🧾 Guardar cita en Google Sheets SIEMPRE (independiente de la elección de calendario)
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
      precio: user.servicePrice,
      fecha: fechaFormateada,
      hora: horaFormateada,
      estado: "Confirmado",
    });
    if (!result.success) {
      console.error("❌ Fallo al guardar cita en Google Sheets:", result.error);
      console.error(
        "⚠️  La cita del usuario fue confirmada pero NO se guardó en la hoja"
      );
    }
  } catch (error) {
    console.error("❌ Error al guardar cita en Google Sheets:", error);
  }

  if (!wantsCalendar) {
    user.state = "COMPLETED";
    const formattedDate = formatDateForUser(user.parsedAppointmentDate);

    const confirmationMessage = `🎉 ¡Tu cita ha sido agendada exitosamente!

📋 *Detalles de tu cita:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
💵 Precio: S/${user.servicePrice}
📅 Fecha y hora: ${formattedDate}

Te esperamos, ${user.name}. ¡Gracias por confiar en nosotros!

Si necesitas hacer otra reserva, envía "Hola" nuevamente.`;

    await whatsappService.sendMessage(user.phoneNumber, confirmationMessage);
    return;
  }

  if (!googleAuthService.hasValidTokens(user)) {
    const domain = googleAuthService.getPublicUrl();
    const authUrl = `${domain}/google/auth?phone=${encodeURIComponent(
      user.phoneNumber
    )}`;

    await whatsappService.sendMessage(
      user.phoneNumber,
      `Para agregar la cita a tu Google Calendar, necesito que autorices el acceso.\n\n🔗 Haz clic en este enlace para autorizar:\n${authUrl}\n\nDespués de autorizar, regresa aquí y envía la fecha de tu cita nuevamente.`
    );

    user.state = "WAITING_DATE";
    return;
  }

  try {
    const { start, end } = createCalendarDateTime(
      user.parsedAppointmentDate,
      1
    );

    const eventDetails = {
      summary: user.selectedService,
      description: `Cita para ${user.name}\nTeléfono: ${user.collectedPhone}`,
      startDateTime: start,
      endDateTime: end,
    };

    await googleAuthService.createCalendarEvent(user, eventDetails);

    user.state = "COMPLETED";
    const formattedDate = formatDateForUser(user.parsedAppointmentDate);

    const confirmationMessage = `🎉 ¡Tu cita ha sido agendada exitosamente!

📋 *Detalles de tu cita:*

📍 Local: ${user.selectedLocation}
👤 Nombre: ${user.name}
📞 Teléfono: ${user.collectedPhone}
💅 Servicio: ${user.selectedService}
💵 Precio: S/${user.servicePrice}
📅 Fecha y hora: ${formattedDate}

✅ La cita ha sido añadida a tu Google Calendar con recordatorio 10 minutos antes.

Te esperamos, ${user.name}. ¡Gracias por confiar en nosotros!

Si necesitas hacer otra reserva, envía "Hola" nuevamente.`;

    await whatsappService.sendMessage(user.phoneNumber, confirmationMessage);
  } catch (error) {
    console.error("Error creando evento en Google Calendar:", error);

    if (error.message.includes("Token expirado")) {
      const domain = googleAuthService.getPublicUrl();
      const authUrl = `${domain}/google/auth?phone=${encodeURIComponent(
        user.phoneNumber
      )}`;

      await whatsappService.sendMessage(
        user.phoneNumber,
        `Tu autorización de Google Calendar expiró. Por favor, autoriza nuevamente:\n${authUrl}`
      );

      user.state = "WAITING_DATE";
    } else {
      user.state = "COMPLETED";
      const formattedDate = formatDateForUser(user.parsedAppointmentDate);

      await whatsappService.sendMessage(
        user.phoneNumber,
        `Tu cita fue agendada pero hubo un problema al agregar el evento a Google Calendar.\n\n📋 *Detalles de tu cita:*\n\n👤 Nombre: ${user.name}\n📅 Fecha y hora: ${formattedDate}\n\nTe esperamos, ${user.name}.`
      );
    }
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
      'Tu cita ya fue agendada. Si deseas hacer otra reserva, envía "Hola".'
    );
  }
}

module.exports = {
  processMessage,
};
