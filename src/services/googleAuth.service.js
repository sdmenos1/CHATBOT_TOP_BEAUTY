const { google } = require("googleapis");
const User = require("../models/user.model");

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(phoneNumber) {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: phoneNumber,
    prompt: "consent",
  });

  return authUrl;
}

async function handleOAuthCallback(code, phoneNumber) {
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    user.googleTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };

    await user.save();

    return tokens;
  } catch (error) {
    console.error("Error en OAuth callback:", error);
    throw error;
  }
}

async function refreshAccessToken(user) {
  try {
    if (!user.googleTokens || !user.googleTokens.refresh_token) {
      throw new Error("No hay refresh token disponible");
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: user.googleTokens.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    user.googleTokens.access_token = credentials.access_token;
    user.googleTokens.expiry_date = credentials.expiry_date;

    await user.save();

    console.log("Token de acceso renovado exitosamente");
    return credentials;
  } catch (error) {
    console.error("Error renovando token:", error);
    throw new Error("No se pudo renovar el token. Re-autorización necesaria.");
  }
}

async function createCalendarEvent(user, eventDetails) {
  try {
    if (!user.googleTokens || !user.googleTokens.access_token) {
      throw new Error("Usuario no tiene tokens de Google");
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(user.googleTokens);

    if (
      user.googleTokens.expiry_date &&
      user.googleTokens.expiry_date < Date.now()
    ) {
      console.log("Token expirado, renovando...");
      await refreshAccessToken(user);
      oauth2Client.setCredentials(user.googleTokens);
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: "America/Lima",
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: "America/Lima",
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 10 }],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    console.log("Evento creado en Google Calendar:", response.data.htmlLink);

    const newTokens = oauth2Client.credentials;
    if (newTokens.access_token) {
      user.googleTokens.access_token = newTokens.access_token;
      if (newTokens.expiry_date) {
        user.googleTokens.expiry_date = newTokens.expiry_date;
      }
      await user.save();
    }

    return response.data;
  } catch (error) {
    console.error("Error creando evento en Google Calendar:", error);

    if (error.response && error.response.status === 401) {
      if (user.googleTokens.refresh_token) {
        try {
          await refreshAccessToken(user);
          return await createCalendarEvent(user, eventDetails);
        } catch (refreshError) {
          user.googleTokens = {
            access_token: null,
            refresh_token: null,
            expiry_date: null,
          };
          await user.save();
          throw new Error("Token expirado. Por favor, vuelve a autorizar.");
        }
      } else {
        user.googleTokens = {
          access_token: null,
          refresh_token: null,
          expiry_date: null,
        };
        await user.save();
        throw new Error("Token expirado. Por favor, vuelve a autorizar.");
      }
    }

    throw error;
  }
}

function hasValidTokens(user) {
  if (!user.googleTokens || !user.googleTokens.access_token) {
    return false;
  }

  if (
    user.googleTokens.expiry_date &&
    user.googleTokens.expiry_date < Date.now()
  ) {
    return false;
  }

  return true;
}

function getPublicUrl() {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }

  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }

  return `http://localhost:${process.env.PORT || 3000}`;
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  createCalendarEvent,
  hasValidTokens,
  refreshAccessToken,
  getPublicUrl,
};
