const axios = require("axios");

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

async function sendMessage(to, message) {
  try {
    const url = `${WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        body: message,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function markAsRead(messageId) {
  try {
    const url = `${WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    };

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Message marked as read:", messageId);
  } catch (error) {
    console.error(
      "Error marking message as read:",
      error.response?.data || error.message
    );
  }
}

module.exports = {
  sendMessage,
  markAsRead,
};
