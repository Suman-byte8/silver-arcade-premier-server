const Accommodation = require("../../schema/Reservation/accommodation.model");
const RestaurantReservation = require("../../schema/Reservation/restaurantReservation.model");
const MeetingOrWeddingReservation = require("../../schema/Reservation/meetingOrWeddingReservation.model");

const sendAcknowledgementEmail = require("../../config/mail/reservation/sendAcknowledgementEmail");
const sendConfirmationEmail = require("../../config/mail/reservation/sendConfirmationEmail");
const { emitReservationEvent } = require("../../utils/socketManager");

// Helper → select correct model
const modelSelector = (typeRaw) => {
  const type = (typeRaw || "").toLowerCase();
  if (type === "accommodation") return Accommodation;
  if (type === "restaurant") return RestaurantReservation;
  if (type === "meeting") return MeetingOrWeddingReservation;
  return null;
};

/* ====================================================
   CREATE  (send acknowledgement emails)
==================================================== */
exports.createAccommodationBooking = async (req, res) => {
  try {
    const { arrivalDate, departureDate, rooms, totalAdults, totalChildren, specialRequests, guestInfo, agreeToTnC } = req.body;
    if (!arrivalDate || !departureDate || !rooms || !guestInfo) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const doc = await Accommodation.create({ arrivalDate, departureDate, rooms, totalAdults, totalChildren, specialRequests, guestInfo, agreeToTnC });

    await sendAcknowledgementEmail(doc, "Accommodation");

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

    return res.status(201).json({ success: true, data: doc });
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
