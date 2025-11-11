// REFACTOR NOTE: Removed googleTokens and wantsCalendarIntegration fields - no longer needed
const sessions = new Map();

function getSession(phoneNumber) {
  return sessions.get(phoneNumber) || null;
}

function createSession(phoneNumber) {
  const session = {
    phoneNumber,
    name: null,
    state: "INITIAL",
    selectedLocation: null,
    selectedService: null,
    servicePrice: null,
    collectedPhone: null,
    appointmentDate: null,
    parsedAppointmentDate: null,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  sessions.set(phoneNumber, session);
  return session;
}

function updateSession(phoneNumber, updates) {
  const session = sessions.get(phoneNumber);
  if (!session) {
    return null;
  }

  Object.assign(session, updates, { updatedAt: new Date() });
  sessions.set(phoneNumber, session);
  return session;
}

function resetSession(phoneNumber) {
  const session = sessions.get(phoneNumber);
  if (!session) {
    return null;
  }

  session.state = "INITIAL";
  session.selectedLocation = null;
  session.selectedService = null;
  session.servicePrice = null;
  session.collectedPhone = null;
  session.appointmentDate = null;
  session.parsedAppointmentDate = null;
  session.name = null;
  session.updatedAt = new Date();

  sessions.set(phoneNumber, session);
  return session;
}

function deleteSession(phoneNumber) {
  return sessions.delete(phoneNumber);
}

function getAllSessions() {
  return Array.from(sessions.values());
}

module.exports = {
  getSession,
  createSession,
  updateSession,
  resetSession,
  deleteSession,
  getAllSessions,
};
