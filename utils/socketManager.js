const socketIo = require('socket.io');

let io;

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: '*', // Allow all origins for now
      methods: ['GET', 'POST'],
    },
  });

  // Handle default namespace
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    console.log('Available namespaces:', io.nsps ? Object.keys(io.nsps) : 'No namespaces');

    // Join room for specific table updates
    socket.on('joinTableRoom', (tableId) => {
      socket.join(`table_${tableId}`);
      console.log(`User ${socket.id} joined table room: table_${tableId}`);
    });

    // Leave room for specific table updates
    socket.on('leaveTableRoom', (tableId) => {
      socket.leave(`table_${tableId}`);
      console.log(`User ${socket.id} left table room: table_${tableId}`);
    });

    // Join room for reservation updates
    socket.on('joinReservationRoom', (reservationId) => {
      socket.join(`reservation_${reservationId}`);
      console.log(`User ${socket.id} joined reservation room: reservation_${reservationId}`);
    });

    // Leave room for reservation updates
    socket.on('leaveReservationRoom', (reservationId) => {
      socket.leave(`reservation_${reservationId}`);
      console.log(`User ${socket.id} left reservation room: reservation_${reservationId}`);
    });

    // Handle table status change
    socket.on('tableStatusChange', (data) => {
      console.log('Table status change requested:', data);
      // Emit to all clients in the specific table room AND to all connected clients
      io.to(`table_${data.tableId}`).emit('tableStatusChanged', data);
      io.emit('tableStatusChanged', data); // Broadcast to all clients
    });

    // Handle reservation assignment
    socket.on('reservationAssigned', (data) => {
      console.log('Reservation assigned:', data);
      // Emit to all clients in the reservation room AND to all connected clients
      io.to(`reservation_${data.reservationId}`).emit('reservationAssigned', data);
      io.emit('reservationAssigned', data); // Broadcast to all clients
    });

    // Handle reservation status change
    socket.on('reservationStatusChange', (data) => {
      console.log('Reservation status change:', data);
      // Emit to all clients in the reservation room AND to all connected clients
      io.to(`reservation_${data.reservationId}`).emit('reservationStatusChanged', data);
      io.emit('reservationStatusChanged', data); // Broadcast to all clients
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });

  // Create a default namespace handler to prevent "Invalid namespace" errors
  const defaultNamespace = io.of('/');
  defaultNamespace.on('connection', (socket) => {
    console.log('Client connected to default namespace:', socket.id);

    // Emit all table events to default namespace
    socket.on('tableCreated', (table) => {
      console.log('Table created in default namespace:', table);
      defaultNamespace.emit('tableCreated', table);
    });

    socket.on('tableUpdated', (table) => {
      console.log('Table updated in default namespace:', table);
      defaultNamespace.emit('tableUpdated', table);
    });

    socket.on('tableDeleted', (data) => {
      console.log('Table deleted in default namespace:', data);
      defaultNamespace.emit('tableDeleted', data);
    });

    socket.on('reservationCreated', (reservation) => {
      console.log('Reservation created in default namespace:', reservation);
      defaultNamespace.emit('reservationCreated', reservation);
    });

    socket.on('reservationStatusChanged', (data) => {
      console.log('Reservation status changed in default namespace:', data);
      defaultNamespace.emit('reservationStatusChanged', data);
    });

    socket.on('reservationDeleted', (data) => {
      console.log('Reservation deleted in default namespace:', data);
      defaultNamespace.emit('reservationDeleted', data);
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

// Helper function to emit table events
function emitTableEvent(event, data, tableId = null) {
  if (!io) return;

  if (tableId) {
    // Emit to specific table room
    io.to(`table_${tableId}`).emit(event, data);
  } else {
    // Emit to all connected clients
    io.emit(event, data);
  }
}

// Helper function to emit reservation events
function emitReservationEvent(event, data, reservationId = null) {
  if (!io) return;

  if (reservationId) {
    // Emit to specific reservation room
    io.to(`reservation_${reservationId}`).emit(event, data);
  } else {
    // Emit to all connected clients
    io.emit(event, data);
  }
}

module.exports = {
  init,
  getIo,
  emitTableEvent,
  emitReservationEvent
};
