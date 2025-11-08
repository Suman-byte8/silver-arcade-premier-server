// No-op socket manager for backward compatibility after socket.io removal
// All functions now log warnings instead of performing real-time operations

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
