const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
    // Generate JWT token valid for 30 days
    return jwt.sign(
        { 
            id: userId,
            role: role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
};

const verifyToken = (token) => {
  try {
    if (!token) return null;
    
    // Clean the token string
    const cleanToken = token.replace('Bearer ', '').trim();
    
    // Add debug logging
    // console.log('Verifying token:', cleanToken);
    
    return jwt.verify(cleanToken, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

module.exports = { generateToken, verifyToken };
