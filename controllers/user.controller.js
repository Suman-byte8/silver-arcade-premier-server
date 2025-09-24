const User = require('../schema/user.model');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { generateToken } = require('../middlewares/authMiddleware');
const userActivity = require('../schema/userActivity');
const dbOptimizer = require('../utilities/dbOptimizer');

// Register a new user
async function registerUser(req, res) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Destructure the request body
    const { firstName, lastName, memberShipType, memberShipStartDate, memberShipEndDate, phoneNumber, whatsAppNumber, email, address, alternateNumber, password } = req.body;

    try {
        // Check if user already exists
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user with all provided fields
        const user = new User({
            firstName,
            lastName,
            memberShipType,
            memberShipStartDate,
            memberShipEndDate,
            phoneNumber,
            whatsAppNumber,
            email,
            address,
            alternateNumber,
            password: hashedPassword
        });

        // Save the user to the database
        await user.save();

        // generate jwt
        const payload = {
            user: {
                id: user._id,
                role: user.role
            }
        };

        const token = generateToken(payload.user.id, payload.user.role);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
            token: token
        });

        // Create user activity record (non-blocking)
        try {
            await userActivity.create({
                userId: user._id,
                action: "signup",
                userAgent: req.headers["user-agent"],
                ipAddress: req.ip,
            });
        } catch (activityError) {
            console.error('User activity creation error:', activityError);
            // Don't fail registration if activity logging fails
        }

    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

// login user
// Alternative async/await version
async function loginUser(req, res) {
    const { email, password } = req.body;
    try {
        // Check if user exists (optimized with monitoring)
        let user = await dbOptimizer.findOne(User, { email }, {
            context: { operation: 'user_login_check' }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Generate token
        const token = generateToken(user._id, user.role);
        
        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
            token: token
        });

        await userActivity.create({
            userId: user._id,
            action: "login",
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
          });
          
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// Get user profile
async function getUserProfile(req, res) {
    try {
        const user = await dbOptimizer.findById(User, req.user.id, {
            select: '-password',
            context: { operation: 'get_user_profile' }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                memberShipType: user.memberShipType,
                memberShipStartDate: user.memberShipStartDate,
                memberShipEndDate: user.memberShipEndDate,
                phoneNumber: user.phoneNumber,
                whatsAppNumber: user.whatsAppNumber,
                address: user.address,
                alternateNumber: user.alternateNumber
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error while fetching user profile' });
    }
};

// Update user profile
async function updateUserProfile(req, res) {
    try {
        const userId = req.user.id;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated directly
        delete updateData.email; // Email should not be updated
        delete updateData.role; // Role should not be updated by user
        delete updateData.memberShipType; // Membership should be managed by admin
        delete updateData.memberShipStartDate;
        delete updateData.memberShipEndDate;

        // If password is being updated, hash it
        if (updateData.newPassword) {
            if (!updateData.currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password' });
            }

            // Verify current password
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(updateData.currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.newPassword, salt);
            delete updateData.newPassword;
            delete updateData.currentPassword;
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, select: '-password' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                memberShipType: updatedUser.memberShipType,
                memberShipStartDate: updatedUser.memberShipStartDate,
                memberShipEndDate: updatedUser.memberShipEndDate,
                phoneNumber: updatedUser.phoneNumber,
                whatsAppNumber: updatedUser.whatsAppNumber,
                address: updatedUser.address,
                alternateNumber: updatedUser.alternateNumber
            }
        });

        // Create user activity record (non-blocking)
        try {
            await userActivity.create({
                userId: userId,
                action: "profile_update",
                userAgent: req.headers["user-agent"],
                ipAddress: req.ip,
            });
        } catch (activityError) {
            console.error('User activity creation error:', activityError);
        }

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server error while updating user profile' });
    }
};




async function getUserReservations(req, res) {
    try {
        const userId = req.user.id;

        // This is a placeholder implementation.
        // A real implementation would need to query the different reservation
        // collections (Accommodation, RestaurantReservation, etc.) for reservations
        // associated with this user.
        const reservations = []; // Placeholder

        res.status(200).json({
            success: true,
            reservations: reservations
        });

    } catch (error) {
        console.error('Error fetching user reservations:', error);
        res.status(500).json({ message: 'Server error while fetching user reservations' });
    }
}




module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, getUserReservations };
