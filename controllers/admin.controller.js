const Admin = require('../schema/admin.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userActivity = require("../schema/userActivity");
const { generateToken } = require('../middlewares/authMiddleware');
const dbOptimizer = require('../utilities/dbOptimizer');



// Register Admin
async function registerAdmin(req, res) {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            phoneNumber
        } = req.body;

        // Check if admin exists (optimized with monitoring)
        const adminExists = await dbOptimizer.findOne(Admin, { email }, {
            context: { operation: 'admin_registration_check' }
        });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        const admin = await Admin.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            role: 'admin',
            status: 'active'
        });

        if (admin) {
            const token = generateToken(admin._id, 'admin');
            res.status(201).json({
                success: true,
                message: 'Admin registered successfully',
                admin: {
                    id: admin._id,
                    email: admin.email,
                    role: 'admin',
                    phoneNumber: admin.phoneNumber
                },
                token
            });
        }

    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
}

// Login Admin
async function loginAdmin(req, res) {
    try {
        const { email, password } = req.body;

        console.log('Login attempt for email:', email);

        // Check if admin exists (optimized with monitoring)
        const admin = await dbOptimizer.findOne(Admin, { email }, {
            lean: false,
            context: { operation: 'admin_login_check' }
        });

        if (!admin) {
            console.log('Admin not found for email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('Admin found:', admin._id);

        // Check if admin is active
        if (admin.status !== 'active') {
            console.log('Admin account not active:', admin._id);
            return res.status(403).json({ message: 'Account is not active' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.log('Password mismatch for admin:', admin._id);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('Password verified for admin:', admin._id);

        // Update last login (optimized with monitoring)
        admin.lastLogin = Date.now();
        await dbOptimizer.save(admin, {
            context: { operation: 'admin_last_login_update' }
        });

        console.log('Last login updated for admin:', admin._id);

        // Generate token
        const token = generateToken(admin._id, 'admin');

        console.log('Token generated for admin:', admin._id);

        res.status(200).json({
            success: true,
            message: 'Admin logged in successfully',
            admin: {
                id: admin._id,
                email: admin.email,
                role: 'admin',
                phoneNumber: admin.phoneNumber
            },
            token
        });

    } catch (error) {
        console.error('Admin login error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
}

// Get Admin Profile
async function getAdminProfile(req, res) {
    try {
        const admin = await dbOptimizer.findById(Admin, req.user.id, {
            select: '-password',
            context: { operation: 'get_admin_profile' }
        });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: 'admin',
                phoneNumber: admin.phoneNumber,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
}

const User = require('../schema/user.model');

// Populate User Activity with user details
async function populateUserActivity(req, res) {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Remove unwanted activities with unknown user or N/A actions
        await userActivity.deleteMany({
            $or: [
                { userId: null },
                { action: 'N/A' }
            ]
        });

        // Remove unknown users from User collection
        await User.deleteMany({
            $or: [
                { firstName: { $exists: false } },
                { lastName: { $exists: false } },
                { email: { $exists: false } }
            ]
        });

        // Get total count for pagination
        const totalActivities = await userActivity.countDocuments();

        // Get paginated activities with user details
        const activities = await dbOptimizer.find(userActivity, {}, {
            populate: { path: 'userId', select: 'firstName lastName email' },
            sort: { timestamp: -1 }, // Sort by timestamp descending (latest first)
            skip: skip,
            limit: limit,
            context: { operation: 'populate_user_activity' }
        });

        const totalPages = Math.ceil(totalActivities / limit);

        res.status(200).json({
            success: true,
            activities,
            total: totalActivities,
            totalPages,
            currentPage: page,
            limit
        });
    } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({ message: 'Server error while fetching user activities' });
    }
}

// Get User Profile by ID
async function getUserProfile(req, res) {
    try {
        const user = await dbOptimizer.findById(User, req.params.userId, {
            select: '-password',
            context: { operation: 'get_user_profile' }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error while fetching user profile' });
    }
}

// Delete User by ID
async function deleteUser(req, res) {
    try {
        const userId = req.params.userId;

        // Check if user exists
        const user = await dbOptimizer.findById(User, userId, {
            context: { operation: 'delete_user_check' }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete user activities first using mongoose directly
        await userActivity.deleteMany({ userId });

        // Delete the user using dbOptimizer
        await dbOptimizer.delete(User, userId, {
            context: { operation: 'delete_user' }
        });

        res.status(200).json({
            success: true,
            message: 'User and associated activities deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error while deleting user' });
    }
}

// Delete All Users
async function deleteAllUsers(req, res) {
    try {
        // Delete all user activities first
        await userActivity.deleteMany({});

        // Delete all users
        const result = await User.deleteMany({});

        res.status(200).json({
            success: true,
            message: `All users and associated activities deleted successfully. Deleted ${result.deletedCount} users.`
        });

    } catch (error) {
        console.error('Error deleting all users:', error);
        res.status(500).json({ message: 'Server error while deleting all users' });
    }
}

// Get Total Registered Users Count
async function getTotalUsers(req, res) {
    try {
        const totalUsers = await User.countDocuments();

        res.status(200).json({
            success: true,
            totalUsers
        });

    } catch (error) {
        console.error('Error fetching total users count:', error);
        res.status(500).json({ message: 'Server error while fetching total users count' });
    }
}

module.exports = {
    registerAdmin,
    loginAdmin,
    getAdminProfile,
    populateUserActivity,
    getUserProfile,
    deleteUser,
    deleteAllUsers,
    getTotalUsers,
};
