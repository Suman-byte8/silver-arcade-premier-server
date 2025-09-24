const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utilities/jwtToken');
const Admin = require('../schema/admin.model');
const User = require('../schema/user.model');


const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && /^Bearer\s/i.test(req.headers.authorization)) {
            token = req.headers.authorization.trim();

            // Verify token using the utility function
            const decoded = verifyToken(token);
            if (!decoded) {
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            }

            // Check if user/admin based on role
            if (decoded.role === 'admin') {
                req.user = await Admin.findById(decoded.id).select('-password');
            } else {
                req.user = await User.findById(decoded.id).select('-password');
            }

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Set the role from token to ensure it's available
            req.user.role = decoded.role;

            next();
        } else {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};


// Middleware to authorize based on user or admin model
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};
  

const generateToken = (id, role) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in the environment variables.');
    }
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

module.exports = { generateToken, protect, authorize };
