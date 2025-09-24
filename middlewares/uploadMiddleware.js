const multer = require('multer');

const storage = multer.memoryStorage();

// Configurable file size limits (default to 50MB if not set in environment)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
const MAX_HERO_FILE_SIZE = parseInt(process.env.MAX_HERO_FILE_SIZE) || MAX_FILE_SIZE;
const MAX_ROOM_IMAGES_SIZE = parseInt(process.env.MAX_ROOM_IMAGES_SIZE) || MAX_FILE_SIZE;

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Not an image! Please upload only images.'), false);
        }

        // Check file size based on field name
        if (file.size > MAX_FILE_SIZE) {
            return cb(new Error(`File size too large. Maximum allowed size is ${formatFileSize(MAX_FILE_SIZE)}.`), false);
        }

        cb(null, true);
    }
});

// Custom error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: `File too large. Maximum allowed size is ${formatFileSize(MAX_FILE_SIZE)}.`,
                maxSize: MAX_FILE_SIZE,
                maxSizeFormatted: formatFileSize(MAX_FILE_SIZE)
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(413).json({
                success: false,
                message: 'Too many files uploaded.'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field.'
            });
        }
    }
    
    if (err.message && err.message.includes('Not an image')) {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed.'
        });
    }
    
    if (err.message && err.message.includes('File size too large')) {
        return res.status(413).json({
            success: false,
            message: err.message,
            maxSize: MAX_FILE_SIZE,
            maxSizeFormatted: formatFileSize(MAX_FILE_SIZE)
        });
    }

    // Pass other errors to the default error handler
    next(err);
};

// Helper function to format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    upload,
    handleMulterError,
    MAX_FILE_SIZE,
    MAX_HERO_FILE_SIZE,
    MAX_ROOM_IMAGES_SIZE,
    formatFileSize
};
