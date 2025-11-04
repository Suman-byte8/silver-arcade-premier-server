const Accommodation = require("../../schema/Reservation/accommodation.model");
const RestaurantReservation = require("../../schema/Reservation/restaurantReservation.model");
const MeetingOrWeddingReservation = require("../../schema/Reservation/meetingOrWeddingReservation.model");
const Table = require("../../schema/Table/table.model");
const Room = require("../../schema/rooms.model");
const Reservation = require("../../schema/Reservation/reservation.model");

const sendAcknowledgementEmail = require("../../config/mail/reservation/sendAcknowledgementEmail");
const sendConfirmationEmail = require("../../config/mail/reservation/sendConfirmationEmail");
const { emitReservationEvent, emitTableEvent } = require("../../utils/socketManager");

// Helper → select correct model
const modelSelector = (typeRaw) => {
  const type = (typeRaw || "").toLowerCase();
  if (type === "accommodation") return Accommodation;
  if (type === "restaurant") return RestaurantReservation;
  if (type === "meeting") return MeetingOrWeddingReservation;
  if (type === "room") return Reservation;
  return null;
};

/* ====================================================
   CREATE  (send acknowledgement emails)
==================================================== */
exports.createAccommodationBooking = async (req, res) => {
  try {
    const { 
      arrivalDate, 
      departureDate, 
      checkInTime, 
      checkOutTime, 
      nights, 
      selectedRoomTypes, 
      totalAdults, 
      totalChildren, 
      specialRequests, 
      guestInfo 
    } = req.body;

    // Validate required fields
    if (!arrivalDate || !departureDate || !checkInTime || !checkOutTime || !nights || !selectedRoomTypes || !guestInfo) {
      console.log('Missing required fields:', { body: req.body });
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields",
        details: {
          arrivalDate: !arrivalDate,
          departureDate: !departureDate,
          checkInTime: !checkInTime,
          checkOutTime: !checkOutTime,
          nights: !nights,
          selectedRoomTypes: !selectedRoomTypes,
          guestInfo: !guestInfo
        }
      });
    }

    // Validate room types
    if (!Array.isArray(selectedRoomTypes) || selectedRoomTypes.length === 0 || 
        !selectedRoomTypes.every(room => room.type && room.count > 0)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid room types. Each room must have a type and count > 0" 
      });
    }

    // Create the accommodation booking
    const doc = await Accommodation.create({ 
      typeOfReservation: 'accommodation',
      arrivalDate, 
      departureDate, 
      checkInTime, 
      checkOutTime, 
      nights, 
      selectedRoomTypes,
      totalAdults: Math.max(1, totalAdults || 1),
      totalChildren: Math.max(0, totalChildren || 0),
      specialRequests: specialRequests || '',
      guestInfo: {
        name: guestInfo.name,
        phoneNumber: guestInfo.phoneNumber,
        email: guestInfo.email
      }
    });

    await sendAcknowledgementEmail(doc, "Accommodation");

    // Emit socket event for real-time updates
    emitReservationEvent('reservationCreated', doc);

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('Accommodation booking error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message,
      error: err 
    });
  }
};

exports.createRestaurantReservation = async (req, res) => {
  try {
    const { typeOfReservation, noOfDiners, date, timeSlot, guestInfo, specialRequests, additionalDetails, agreeToTnC } = req.body;
    if (!typeOfReservation || !noOfDiners || !date || !timeSlot || !guestInfo) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const doc = await RestaurantReservation.create({ typeOfReservation, noOfDiners, date, timeSlot, guestInfo, specialRequests, additionalDetails, agreeToTnC });

    await sendAcknowledgementEmail(doc, "Restaurant");

    // Emit socket event for real-time updates
    emitReservationEvent('reservationCreated', doc);

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("Error in createRestaurantReservation:", err);
    return res.status(500).json({ success: false, message: err.message, error: err });
  }
};

exports.createMeetingReservation = async (req, res) => {
  try {
    const { typeOfReservation, reservationDate, reservationEndDate, numberOfRooms, numberOfGuests, additionalDetails, guestInfo, agreeToTnC } = req.body;
    if (!typeOfReservation || !reservationDate || !reservationEndDate || !guestInfo) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const doc = await MeetingOrWeddingReservation.create({ typeOfReservation, reservationDate, reservationEndDate, numberOfRooms, numberOfGuests, additionalDetails, guestInfo, agreeToTnC });

    await sendAcknowledgementEmail(doc, "Meeting");

    // Emit socket event for real-time updates
    emitReservationEvent('reservationCreated', doc);

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRoomBooking = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, numberOfGuests, specialRequests, guestInfo } = req.body;
    
    // Verify room exists and is available
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    if (room.roomStatus !== 'available') {
      return res.status(400).json({ success: false, message: "Room is not available" });
    }

    // Calculate total price (you may want to adjust this based on your pricing logic)
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = room.roomPrice * nights;

    // Create reservation
    const reservation = await Reservation.create({
      room: roomId,
      guest: req.user._id, // Assuming you have user auth middleware
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalPrice,
      numberOfGuests,
      specialRequests,
      guestInfo
    });

    // Update room status
    room.roomStatus = 'booked';
    room.currentBooking = reservation._id;
    await room.save();

    // Send email confirmation
    await sendAcknowledgementEmail(reservation, "Room");

    // Emit socket event
    emitReservationEvent('roomReservationCreated', reservation);

    return res.status(201).json({ 
      success: true, 
      data: reservation
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ====================================================
   READ
==================================================== */
exports.getReservations = async (req, res) => {
  try {
    const { type, status, search, startDate, endDate, sortBy = "date_desc", page = 1, limit = 50 } = req.query;
    const Model = modelSelector(type);
    if (!Model) return res.status(400).json({ success: false, message: "Invalid type" });

    const query = {};
    if (status && status !== "All Status") query.status = status.toLowerCase();
    if (startDate || endDate) {
      query.reservationDate = {};
      if (startDate) query.reservationDate.$gte = new Date(startDate);
      if (endDate) query.reservationDate.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { "guestInfo.name": new RegExp(search, "i") },
        { "guestInfo.email": new RegExp(search, "i") },
        { "guestInfo.phoneNumber": new RegExp(search, "i") },
      ];
    }

    const sort = {};
    if (sortBy.includes("date")) sort.createdAt = sortBy === "date_desc" ? -1 : 1;
    if (sortBy.includes("name")) sort["guestInfo.name"] = 1;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Model.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Model.countDocuments(query),
    ]);

    return res.json({ success: true, items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = modelSelector(type);
    if (!Model) return res.status(400).json({ success: false, message: "Invalid type" });

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRoomBookings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const bookings = await Reservation.find({ room: roomId })
      .populate('guest', 'name email')
      .sort({ checkIn: -1 });
    
    return res.json({ success: true, data: bookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ====================================================
   UPDATE STATUS (send confirmation email when confirmed)
==================================================== */
exports.updateStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;
    const Model = modelSelector(type);
    if (!Model) return res.status(400).json({ success:false, message:"Invalid type" });

    const updated = await Model.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    if (status.toLowerCase() === "confirmed") {
      await sendConfirmationEmail(updated, type);

      // Assign table for restaurant reservations
      if (type === "restaurant") {
        const table = await Table.findOne({ status: 'available', capacity: { $gte: updated.noOfDiners } }).sort({ capacity: 1 });
        if (table) {
          table.status = 'reserved';
          table.currentReservation = {
            reservationId: updated._id,
            reservationType: 'restaurant',
            guestName: updated.guestInfo.name,
            assignedBy: req.user ? req.user._id : null
          };
          table.currentGuest = updated.guestInfo.name;
          table.lastAssignedAt = new Date();
          await table.save();

          // Emit socket events for table update
          emitTableEvent('tableUpdated', table, table._id);
          emitTableEvent('tableStatusChanged', { tableId: table._id, tableNumber: table.tableNumber, status: table.status }, table._id);
        } else {
          console.warn(`No available table for reservation ${id}`);
        }
      }
    }

    if (status.toLowerCase() === "cancelled") {
      // Free assigned tables
      const assignedTables = await Table.find({ 'currentReservation.reservationId': updated._id });
      for (const tableDoc of assignedTables) {
        tableDoc.status = 'available';
        tableDoc.currentReservation = { reservationId: null, reservationType: null, guestName: null, assignedBy: null };
        tableDoc.currentGuest = null;
        tableDoc.lastFreedAt = new Date();
        tableDoc.assignmentHistory.push({
          reservationId: updated._id,
          reservationType: type,
          guestName: updated.guestInfo.name,
          assignedAt: tableDoc.lastAssignedAt || new Date(),
          freedAt: new Date(),
          assignedBy: req.user ? req.user._id : null,
          notes: 'Reservation cancelled'
        });
        await tableDoc.save();

        // Emit socket events for table update
        emitTableEvent('tableUpdated', tableDoc, tableDoc._id);
        emitTableEvent('tableStatusChanged', { tableId: tableDoc._id, tableNumber: tableDoc.tableNumber, status: tableDoc.status }, tableDoc._id);
      }
    }

    // Emit socket event for real-time updates
    emitReservationEvent('reservationStatusChanged', { id, status, updated }, id);

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const { type, id } = req.params;
    const updatedData = req.body;
    const Model = modelSelector(type);
    if (!Model) return res.status(400).json({ success: false, message: "Invalid type" });

    const updated = await Model.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    // Emit socket event for real-time updates (optional, depending on requirements)
    // emitReservationEvent('reservationUpdated', { id, updatedData, updated }, id);

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Error in updateReservation:", err);
    return res.status(500).json({ success: false, message: err.message, error: err });
  }
};

/* ====================================================
   DELETE
==================================================== */
exports.deleteReservation = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = modelSelector(type);
    if (!Model) return res.status(400).json({ success:false, message:"Invalid type" });

    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success:false, message:"Not found" });

    // Emit socket event for real-time updates
    emitReservationEvent('reservationDeleted', { id, deleted }, id);

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
