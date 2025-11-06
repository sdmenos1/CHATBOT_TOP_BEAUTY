const flowService = require("../services/flow.service");
const { parseIncomingMessage } = require("../utils/messageParser");

async function handleWebhookVerification(req, res) {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      console.error("Webhook verification failed");
      res.sendStatus(403);
    }
  } catch (error) {
    console.error("Error in webhook verification:", error);
    res.sendStatus(500);
  }
}

async function handleIncomingMessage(req, res) {
  try {
    const parsedMessage = parseIncomingMessage(req);

    if (!parsedMessage) {
      // WhatsApp a veces manda notificaciones que no son mensajes, se ignoran
      return res.sendStatus(200);
    }

    console.log("Incoming message:", {
      from: parsedMessage.from,
      text: parsedMessage.text,
      messageId: parsedMessage.messageId,
    });

    // 👉 Responde inmediatamente a Meta (para evitar timeout)
    res.sendStatus(200);

    // 👉 Luego procesa el mensaje de forma asíncrona (sin esperar respuesta)
    flowService
      .processMessage(
        parsedMessage.from,
        parsedMessage.text,
        parsedMessage.messageId
      )
      .catch((err) => console.error("Error procesando mensaje:", err));
  } catch (error) {
    console.error("Error handling incoming message:", error);
    if (!res.headersSent) res.sendStatus(500);
  }
}

module.exports = {
  handleWebhookVerification,
  handleIncomingMessage,
};
