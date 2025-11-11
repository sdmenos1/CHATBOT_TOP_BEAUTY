const flowService = require("../services/flow.service");
const { parseIncomingMessage } = require("../utils/messageParser");

// REFACTOR NOTE: Concurrency handling is already correct - webhook responds immediately
// and message processing happens asynchronously
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
      return res.sendStatus(200);
    }

    console.log("Incoming message:", {
      from: parsedMessage.from,
      text: parsedMessage.text,
      messageId: parsedMessage.messageId,
    });

    // CONCURRENCY FIX: Respond immediately to Meta (prevents timeout)
    res.sendStatus(200);

    // CONCURRENCY FIX: Process message asynchronously (doesn't block other requests)
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
