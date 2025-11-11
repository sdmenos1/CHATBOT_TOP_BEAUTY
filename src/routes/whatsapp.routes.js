const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsapp.controller");

// REFACTOR NOTE: Google OAuth routes removed - no longer needed
router.get("/webhook", whatsappController.handleWebhookVerification);
router.post("/webhook", whatsappController.handleIncomingMessage);

module.exports = router;
