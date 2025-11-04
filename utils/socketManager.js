const socketIo = require('socket.io');

let io;

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Room booking related events
    socket.on('joinRoomBookingRoom', (roomId) => {
      socket.join(`room_${roomId}`);
      console.log(`Socket ${socket.id} joined room_${roomId}`);
    });

    socket.on('leaveRoomBookingRoom', (roomId) => {
      socket.leave(`room_${roomId}`);
      console.log(`Socket ${socket.id} left room_${roomId}`);
    });

    // Table related events
    socket.on('tableCreated', (table) => {
      console.log('Table created:', table);
      io.emit('tableCreated', table);
    });

    socket.on('tableUpdated', (table) => {
      console.log('Table updated:', table);
      io.emit('tableUpdated', table);
    });

    socket.on('tableDeleted', (data) => {
      console.log('Table deleted:', data);
      io.emit('tableDeleted', data);
    });

    socket.on('tableStatusChange', (data) => {
      console.log('Table status change requested:', data);
      io.emit('tableStatusChanged', data);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

function emitTableEvent(event, data) {
  if (!io) {
    console.warn('Socket.io not initialized, skipping event emission');
    return;
  }
  console.log(`Emitting ${event}:`, data);
  io.emit(event, data);
}

function emitRoomEvent(event, roomId, data) {
  if (!io) {
    console.warn('Socket.io not initialized, skipping event emission');
    return;
  }
  console.log(`Emitting ${event} to room_${roomId}:`, data);
  io.to(`room_${roomId}`).emit(event, data);
}

function emitReservationEvent(event, data) {
  if (!io) {
    console.warn('Socket.io not initialized, skipping event emission');
    return;
  }
  console.log(`Emitting ${event}:`, data);
  io.emit(event, data);
}

module.exports = {
  init,
  getIo,
  emitTableEvent,
  emitRoomEvent,
  emitReservationEvent
};
