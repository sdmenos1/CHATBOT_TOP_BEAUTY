function parseIncomingMessage(req) {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return null;
    }

    return {
      from: message.from,
      messageId: message.id,
      timestamp: message.timestamp,
      text: message.text?.body || "",
      type: message.type,
      name: value.contacts?.[0]?.profile?.name || "Asesora",
    };
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
}

function normalizeLocationSelection(text) {
  const normalized = text.trim().toLowerCase();

  if (normalized === "1" || normalized.includes("chimbote")) {
    return "Chimbote";
  }
  if (normalized === "2" || normalized.includes("trujillo")) {
    return "Trujillo";
  }
  if (normalized === "3" || normalized.includes("olivos")) {
    return "Olivos";
  }
  if (normalized === "4" || normalized.includes("arequipa")) {
    return "Arequipa";
  }
  if (normalized === "5" || normalized.includes("lince")) {
    return "Lince";
  }
  if (normalized === "6" || normalized.includes("pucallpa")) {
    return "Pucallpa";
  }

  if (normalized === "7" || normalized.includes("bogota") || normalized.includes("bogotá")) {
    return "Bogota";
  }
  if (normalized === "8" || normalized.includes("luxury")) {
    return "Luxury";
  }
  if (normalized === "9" || normalized.includes("medellin") || normalized.includes("medellín")) {
    return "Medellin";
  }
  if (normalized === "10" || normalized.includes("chapineros") || normalized.includes("chapinero")) {
    return "Chapineros";
  }
  if (normalized === "11" || normalized.includes("los leones") || normalized.includes("losleones") || normalized.includes("los  leones")) {
    return "Los Leones";
  }
  if (normalized === "12" || normalized.includes("providencia")) {
    return "Providencia";
  }

  return null;
}

function normalizeServiceSelection(text) {
  const normalized = text.trim().toLowerCase();

  if (normalized === "1" || normalized.includes("botox")) {
    return { service: "Botox", price: 100 };
  }
  if (
    normalized === "2" ||
    normalized.includes("bioplastia reconstructora") ||
    (normalized.includes("bioplastia") && normalized.includes("reconstructora"))
  ) {
    return { service: "Bioplastia reconstructora", price: 150 };
  }
  if (
    normalized === "3" ||
    normalized.includes("bioplastia organica") ||
    (normalized.includes("bioplastia") && normalized.includes("organica"))
  ) {
    return { service: "Bioplastia organica", price: 200 };
  }
  if (
    normalized === "4" ||
    normalized.includes("bioplastia top laser") ||
    normalized.includes("bioplastia top láser") ||
    (normalized.includes("bioplastia") && normalized.includes("top"))
  ) {
    return { service: "Bioplastia Top Láser", price: 250 };
  }
  if (normalized === "5" || normalized.includes("semipermanente")) {
    return { service: "Semipermanente", price: 300 };
  }
  if (normalized === "6" || normalized.includes("dual")) {
    return { service: "Dual", price: 300 };
  }

  return null;
}

function normalizeConfirmation(text) {
  const normalized = text.trim().toLowerCase();

  if (
    normalized === "si" ||
    normalized === "sí" ||
    normalized === "yes" ||
    normalized === "1" ||
    normalized === "correcto"
  ) {
    return true;
  }
  if (
    normalized === "no" ||
    normalized === "0" ||
    normalized === "incorrecto"
  ) {
    return false;
  }

  return null;
}

function isValidPhone(text) {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,15}$/;
  return phoneRegex.test(text.trim());
}

function isValidName(text) {
  const nameRegex = /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]{2,50}$/;
  return nameRegex.test(text.trim());
}

module.exports = {
  parseIncomingMessage,
  normalizeLocationSelection,
  normalizeServiceSelection,
  normalizeConfirmation,
  isValidPhone,
  isValidName,
};
