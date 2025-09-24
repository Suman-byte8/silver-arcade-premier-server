const Facility = require('../../../schema/Client Content Models/Our Facilities/facilities.model');
const cloudinary = require('../../../config/cloudinary');
const streamifier = require('streamifier');

// --- Cloudinary Upload Helper ---
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'silver-arcade-premier-facilities',
        transformation: [{ width: 1024, crop: 'limit' }, { quality: 'auto' }],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// --- Bulk Operations Helper ---
const bulkCreateFacilities = async (facilitiesData) => {
  try {
    const operations = facilitiesData.map(facility => ({
      insertOne: {
        document: facility
      }
    }));
    
    const result = await Facility.bulkWrite(operations, { ordered: false });
    return result;
  } catch (error) {
    console.error('Bulk create error:', error);
    throw error;
  }
};

const bulkUpdateFacilities = async (updateOperations) => {
  try {
    const result = await Facility.bulkWrite(updateOperations, { ordered: false });
    return result;
  } catch (error) {
    console.error('Bulk update error:', error);
    throw error;
  }
};

const bulkDeleteFacilities = async (facilityIds) => {
  try {
    const operations = facilityIds.map(id => ({
      deleteOne: {
        filter: { _id: id }
      }
    }));
    
    const result = await Facility.bulkWrite(operations, { ordered: false });
    return result;
  } catch (error) {
    console.error('Bulk delete error:', error);
    throw error;
  }
};

// Get all facilities
async function getFacilities(req, res) {
  try {
    const facilities = await Facility.find({ isActive: true })
      .select('title subtitle description image path order createdAt') // Include description field
      .sort({ order: 1 })
      .lean(); // Returns plain JS objects (faster)
    
    res.status(200).json({
      success: true,
      facilities
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ message: 'Server error while fetching facilities' });
  }
}

// Get facility by ID
async function getFacilityById(req, res) {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    res.status(200).json({
      success: true,
      facility
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({ message: 'Server error while fetching facility' });
  }
}

// Create new facility
async function createFacility(req, res) {
  try {
    const { title, subtitle, description, path, order, isActive } = req.body;
    
    let imageUrl = '/assets/default-facility.jpg'; // Default image
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed, using default image:', uploadError);
        // Continue with default image instead of failing
      }
    }

    const facility = new Facility({
      title,
      subtitle,
      description,
      path,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      image: imageUrl
    });

    await facility.save();

    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      facility
    });
  } catch (error) {
    console.error('Error creating facility:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating facility',
      error: error.message 
    });
  }
}

// Update facility
async function updateFacility(req, res) {
  try {
    const { title, subtitle, description, path, order, isActive } = req.body;
    
    let updateData = {
      title,
      subtitle,
      description,
      path,
      order,
      isActive
    };

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        updateData.image = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed during update:', uploadError);
        // Don't update the image if upload fails, keep existing image
        delete updateData.image;
      }
    }

    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Facility updated successfully',
      facility
    });
  } catch (error) {
    console.error('Error updating facility:', error);
    res.status(500).json({ message: 'Server error while updating facility' });
  }
}

// Delete facility
async function deleteFacility(req, res) {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Facility deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting facility:', error);
    res.status(500).json({ message: 'Server error while deleting facility' });
  }
}

module.exports = {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  bulkCreateFacilities,
  bulkUpdateFacilities,
  bulkDeleteFacilities
};
