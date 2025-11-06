const express = require("express");
const router = express.Router();
const googleAuthService = require("../services/googleAuth.service");
const whatsappService = require("../services/whatsapp.service");

router.get("/google/auth", async (req, res) => {
  try {
    const phoneNumber = req.query.phone;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Número de teléfono requerido" });
    }

    const authUrl = googleAuthService.getAuthUrl(phoneNumber);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error en /google/auth:", error);
    res.status(500).json({ error: "Error al generar URL de autorización" });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const phoneNumber = req.query.state;

    if (!code || !phoneNumber) {
      return res.status(400).send("Parámetros faltantes");
    }

    await googleAuthService.handleOAuthCallback(code, phoneNumber);

    await whatsappService.sendMessage(
      phoneNumber,
      "✅ ¡Autorización exitosa! Ya puedes crear eventos en tu Google Calendar.\n\nPor favor, vuelve a enviar la fecha y hora de tu cita para continuar."
    );

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Autorización Exitosa</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .checkmark {
            font-size: 60px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
          .whatsapp {
            color: #25D366;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>¡Autorización Exitosa!</h1>
          <p>Tu cuenta de Google Calendar ha sido conectada correctamente.</p>
          <p>Regresa a <span class="whatsapp">WhatsApp</span> para continuar con tu reserva.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error en /google/callback:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #f44336; }
        </style>
      </head>
      <body>
        <h1 class="error">Error al procesar la autorización</h1>
        <p>Por favor, intenta nuevamente desde WhatsApp.</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
