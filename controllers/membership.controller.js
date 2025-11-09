const User = require('../schema/user.model');
const { validationResult } = require('express-validator');

const sendMembershipAcknowledgementEmail = require('../config/mail/membership/sendMembershipAcknowledgeEmail');
const sendMembershipApprovalEmail = require('../config/mail/membership/sendMembershipApprovalEmail');
const sendMembershipRejectionEmail = require('../config/mail/membership/sendMembershipRejectionEmail');

// Register a new membership application → send acknowledgement email
async function registerMembership(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, country, state, city } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    if (user.memberShipType && user.memberShipType !== 'rejected') {
      return res.status(400).json({ message: 'User is already a member or application is pending' });
    }

    user.status = 'pending';
    user.memberShipType = ''; 
    user.memberShipStartDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    user.memberShipEndDate = endDate;
    user.state = state;
    user.country = country;
    user.city = city;
    user.address = `${city}, ${state}, ${country}`;

    await user.save();

    await sendMembershipAcknowledgementEmail(user);

    return res.status(200).json({ message: 'Membership application submitted successfully', user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during membership registration' });
  }
}

// Fetch memberships list (pending/approved/rejected/expired)
async function getMemberships(req, res) {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    } else if (status === 'expired') {
      query.memberShipEndDate = { $lt: new Date() };
      query.status = 'approved';
    } else {
      query.status = { $in: ['pending', 'approved', 'rejected'] };
    }

    const users = await User.find(query)
      .select('firstName lastName email phoneNumber status memberShipType memberShipStartDate memberShipEndDate')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return res.status(200).json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching memberships' });
  }
}

// Get membership by ID
async function getMembershipById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching membership by ID' });
  }
}

// Update membership status/type → send approval or rejection emails
async function updateMembershipStatus(req, res) {
  try {
    const { status, membershipType, memberShipStartDate, memberShipEndDate } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status === 'approved' && !['Silver Guest', 'Gold Traveler', 'Platinum Premier', 'Corporate/Business Elite'].includes(membershipType)) {
      return res.status(400).json({ message: 'Invalid membership type' });
    }

    const updateData = { status };
    if (status === 'approved') {
      updateData.memberShipType = membershipType;
      if (memberShipStartDate) updateData.memberShipStartDate = memberShipStartDate;
      if (memberShipEndDate) updateData.memberShipEndDate = memberShipEndDate;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (status === 'approved') {
      await sendMembershipApprovalEmail(user);
    } else if (status === 'rejected') {
      await sendMembershipRejectionEmail(user);
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating membership status' });
  }
}

// Update membership dates for approved members
async function updateMembershipDates(req, res) {
  try {
    const { memberShipStartDate, memberShipEndDate } = req.body;
    if (!memberShipStartDate || !memberShipEndDate) {
      return res.status(400).json({ message: 'Membership start and end dates are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { memberShipStartDate: new Date(memberShipStartDate), memberShipEndDate: new Date(memberShipEndDate) },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating membership dates' });
  }
}

// Delete membership
async function deleteMembership(req, res) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: '', memberShipType: '', memberShipStartDate: null, memberShipEndDate: null, address: '' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Membership deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting membership' });
  }
}

module.exports = {
  registerMembership,
  getMemberships,
  getMembershipById,
  updateMembershipStatus,
  updateMembershipDates,
  deleteMembership
};