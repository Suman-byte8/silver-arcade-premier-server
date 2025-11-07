// Socket.io functionality removed - no longer used
// This file is kept for backward compatibility but all functions are no-ops

function init(server) {
  console.log('Socket.io initialization skipped - real-time features disabled');
  return null;
}

function getIo() {
  console.warn('Socket.io not available - real-time features disabled');
  return null;
}

function emitTableEvent(event, data) {
  console.log(`Socket event skipped: ${event}`, data);
}

function emitRoomEvent(event, roomId, data) {
  console.log(`Socket room event skipped: ${event} for room_${roomId}`, data);
}

function emitReservationEvent(event, data) {
  console.log(`Socket reservation event skipped: ${event}`, data);
}

module.exports = {
  init,
  getIo,
  emitTableEvent,
  emitRoomEvent,
  emitReservationEvent
};
