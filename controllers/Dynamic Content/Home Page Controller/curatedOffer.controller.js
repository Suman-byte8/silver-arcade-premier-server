const cloudinary = require('../../../config/cloudinary');
const streamifier = require('streamifier');

const CuratedOffer = require('../../../schema/Client Content Models/Home/CuratedOffer.model');

// Add Curated Offers
async function addOffers(req, res) {
    try {
        const { title, description, details, page, section, path } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        // Parse details from string to array if it's a string
        let detailsArray = [];
        if (details) {
            if (typeof details === 'string') {
                try {
                    detailsArray = JSON.parse(details);
                } catch (e) {
                    // If it's not valid JSON, treat it as a single item array
                    detailsArray = [details];
                }
            } else if (Array.isArray(details)) {
                detailsArray = details;
            }
        }

        // Upload image to Cloudinary
        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const uploadResult = await streamUpload(req);

        const newOffer = new CuratedOffer({
            title,
            description,
            details: detailsArray,
            image: uploadResult.secure_url,
            page,
            section,
            path
        });

        await newOffer.save();

        res.status(201).json({
            success: true,
            message: 'Curated offer added successfully',
            offer: newOffer
        });

    } catch (error) {
        console.error('Error adding curated offer:', error);
        res.status(500).json({ message: 'Server error while adding curated offer' });
    }
}

// Update Curated Offers
async function updateOffers(req, res) {
    try {
        const { id } = req.params;
        const { title, description, details, page, section, path } = req.body;
        
        // Parse details from string to array if it's a string
        let detailsArray = [];
        if (details) {
            if (typeof details === 'string') {
                try {
                    detailsArray = JSON.parse(details);
                } catch (e) {
                    // If it's not valid JSON, treat it as a single item array
                    detailsArray = [details];
                }
            } else if (Array.isArray(details)) {
                detailsArray = details;
            }
        }

        const updateData = { title, description, details: detailsArray, page, section, path };
        if (req.file) {
            // Upload new image to Cloudinary
            const streamUpload = (req) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream((error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    });
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            const uploadResult = await streamUpload(req);
            updateData.image = uploadResult.secure_url;
        }

        const updatedOffer = await CuratedOffer.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedOffer) {
            return res.status(404).json({ message: 'Curated offer not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Curated offer updated successfully',
            offer: updatedOffer
        });
    } catch (error) {
        console.error('Error updating curated offer:', error);
        res.status(500).json({ message: 'Server error while updating curated offer' });
    }
}

// Delete Curated Offers
async function deleteOffers(req, res) {
    try {
        const { id } = req.params;
        const deletedOffer = await CuratedOffer.findByIdAndDelete(id);
        if (!deletedOffer) {
            return res.status(404).json({ message: 'Curated offer not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Curated offer deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting curated offer:', error);
        res.status(500).json({ message: 'Server error while deleting curated offer' });
    }
}

// Get Curated Offers
async function getOffers(req, res) {
    try {
        const offers = await CuratedOffer.find();
        res.status(200).json({
            success: true,
            offers
        });
    } catch (error) {
        console.error('Error fetching curated offers:', error);
        res.status(500).json({ message: 'Server error while fetching curated offers' });
    }
}


module.exports = {
    addOffers,
    updateOffers,
    deleteOffers,
    getOffers
}