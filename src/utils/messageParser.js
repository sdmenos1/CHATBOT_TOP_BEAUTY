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

  // Map letters a–m to the requested order
  const letter = normalized.length === 1 ? normalized : null;

  const byLetter = {
    a: "Los Olivos",
    b: "Trujillo",
    c: "Arequipa",
    d: "Chimbote",
    e: "Pucallpa",
    f: "Medellín",
    g: "Chico",
    h: "Chapinero",
    i: "Los Leones",
    j: "Providencia",
    k: "Lince",
    l: "Luxury",
    m: "Mor",
  };

  if (letter && byLetter[letter]) return byLetter[letter];

  // Name-based matching (with/without accents, variants)
  if (normalized.includes("los olivos") || normalized === "olivos") return "Los Olivos";
  if (normalized.includes("trujillo") || normalized.includes("trujilllo")) return "Trujillo";
  if (normalized.includes("arequipa")) return "Arequipa";
  if (normalized.includes("chimbote")) return "Chimbote";
  if (normalized.includes("pucallpa")) return "Pucallpa";
  if (normalized.includes("medellin") || normalized.includes("medellín")) return "Medellín";
  if (normalized.includes("chico")) return "Chico";
  if (normalized.includes("chapinero") || normalized.includes("chapineros")) return "Chapinero";
  if (normalized.replace(/\s+/g, " ").includes("los leones")) return "Los Leones";
  if (normalized.includes("providencia")) return "Providencia";
  if (normalized.includes("lince")) return "Lince";
  if (normalized.includes("luxury")) return "Luxury";
  if (normalized === "mor" || normalized.includes(" mor")) return "Mor";

  return null;
}

function normalizeServiceSelection(text) {
  const normalized = text.trim().toLowerCase();

  if (normalized === "1" || normalized.includes("alisado")) {
    return { service: "Alisado" };
  }
  if (normalized === "2" || normalized.includes("laceado")) {
    return { service: "Laceado" };
  }
  if (normalized === "3" || normalized.includes("color")) {
    return { service: "Color" };
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
