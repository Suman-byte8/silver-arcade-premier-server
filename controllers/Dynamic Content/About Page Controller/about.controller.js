const AboutPage = require("../../../schema/Client Content Models/About/about.model.js")
const cloudinary = require('../../../config/cloudinary.js');
const streamifier = require('streamifier');
const dbOptimizer = require('../../../utilities/dbOptimizer');

// --- Cloudinary Upload Helper ---

/**
 * @description A helper function to upload a file buffer to Cloudinary as a stream.
 * @param {Buffer} fileBuffer The buffer of the file to upload.
 * @returns {Promise<object>} A promise that resolves with the Cloudinary upload result.
 */
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'silver-arcade-premier-about',
        // Optional: Add transformations for optimization
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


/**
 * @description Get the entire About Page content. If it doesn't exist, create it with default values.
 * @route GET /api/about
 * @access Public
 */
const getAboutPage = async (req, res) => {
  try {
    let aboutPage = await dbOptimizer.findOne(AboutPage, {}, {
      context: { operation: 'get_about_page' }
    });
    if (!aboutPage) {
      aboutPage = await dbOptimizer.create(AboutPage, {
        aboutUsSection: {
          title: 'About Us',
          description: 'Welcome to our about page!',
        },
        contentBlocks: [],
        amenities: [],
        services: []
      }, {
        context: { operation: 'create_default_about_page' }
      });
    }
    res.status(200).json(aboutPage);
  } catch (error) {
    console.error('Error fetching About Page content:', error);
    res.status(500).json({ message: 'Error fetching About Page content', error: error.message });
  }
};

// --- About Us Section Controllers ---

/**
 * @description Update the About Us section.
 * @route PUT /api/about/about-us
 * @access Private/Admin
 */
const updateAboutUsSection = async (req, res) => {
  try {
    const { title, description } = req.body;
    const aboutPage = await dbOptimizer.findOne(AboutPage, {}, {
      lean: false, // We need the Mongoose document to call save()
      context: { operation: 'update_about_us_section' }
    });
    if (!aboutPage) {
      return res.status(404).json({ message: 'About Page not found' });
    }

    if (title) aboutPage.aboutUsSection.title = title;
    if (description) aboutPage.aboutUsSection.description = description;

    if (req.file) {
      if (aboutPage.aboutUsSection.headerImage && aboutPage.aboutUsSection.headerImage.public_id) {
        await cloudinary.uploader.destroy(aboutPage.aboutUsSection.headerImage.public_id);
      }
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      aboutPage.aboutUsSection.headerImage = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    await dbOptimizer.save(aboutPage, {
      context: { operation: 'save_about_us_section' }
    });
    res.status(200).json(aboutPage.aboutUsSection);
  } catch (error) {
    console.error('Error updating About Us section:', error);
    res.status(500).json({ message: 'Error updating About Us section', error: error.message });
  }
};

// --- Generic CRUD Functions for Sub-documents ---

const addItem = (itemName, sectionName) => async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: `Title and description are required for ${itemName}` });
  }

  try {
    const aboutPage = await dbOptimizer.findOne(AboutPage, {}, {
      lean: false, // We need the Mongoose document to call save()
      context: { operation: `add_${itemName.toLowerCase().replace(' ', '_')}` }
    });
    if (!aboutPage) {
      return res.status(404).json({ message: 'About Page not found' });
    }

    const newItem = { title, description };
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        newItem.image = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      } catch (uploadError) {
        console.error(`Cloudinary upload failed for ${itemName}:`, uploadError);
        // Continue without image instead of failing
      }
    }

    // Ensure the section array exists
    if (!aboutPage[sectionName]) {
      aboutPage[sectionName] = [];
    }
    
    aboutPage[sectionName].push(newItem);
    await dbOptimizer.save(aboutPage, {
      context: { operation: `save_added_${itemName.toLowerCase().replace(' ', '_')}` }
    });
    res.status(201).json(aboutPage[sectionName]);
  } catch (error) {
    console.error(`Error adding ${itemName}:`, error);
    res.status(500).json({ message: `Error adding ${itemName}` , error: error.message });
  }
};

const updateItem = (itemName, sectionName) => async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const aboutPage = await dbOptimizer.findOne(AboutPage, {}, {
      lean: false, // We need the Mongoose document to call save()
      context: { operation: `update_${itemName.toLowerCase().replace(' ', '_')}` }
    });
    if (!aboutPage) {
      return res.status(404).json({ message: 'About Page not found' });
    }

    const item = aboutPage[sectionName].id(id);
    if (!item) {
      return res.status(404).json({ message: `${itemName} not found` });
    }

    if (title) item.title = title;
    if (description) item.description = description;

    if (req.file) {
      if (item.image && item.image.public_id) {
        await cloudinary.uploader.destroy(item.image.public_id);
      }
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      item.image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    await dbOptimizer.save(aboutPage, {
      context: { operation: `save_updated_${itemName.toLowerCase().replace(' ', '_')}` }
    });
    res.status(200).json(item);
  } catch (error) {
    console.error(`Error updating ${itemName}:`, error);
    res.status(500).json({ message: `Error updating ${itemName}`, error: error.message });
  }
};

const deleteItem = (itemName, sectionName) => async (req, res) => {
  const { id } = req.params;

  try {
    const aboutPage = await dbOptimizer.findOne(AboutPage, {}, {
      lean: false, // We need the Mongoose document to call save()
      context: { operation: `delete_${itemName.toLowerCase().replace(' ', '_')}` }
    });
    if (!aboutPage) {
      return res.status(404).json({ message: 'About Page not found' });
    }

    const item = aboutPage[sectionName].id(id);
    if (!item) {
      return res.status(404).json({ message: `${itemName} not found` });
    }

    if (item.image && item.image.public_id) {
      await cloudinary.uploader.destroy(item.image.public_id);
    }

    aboutPage[sectionName].pull(id);
    await dbOptimizer.save(aboutPage, {
      context: { operation: `save_deleted_${itemName.toLowerCase().replace(' ', '_')}` }
    });
    res.status(200).json({ message: `${itemName} deleted successfully` });
  } catch (error) {
    console.error(`Error deleting ${itemName}:`, error);
    res.status(500).json({ message: `Error deleting ${itemName}`, error: error.message });
  }
};

// --- Content Block Controllers ---
const addContentBlock = addItem('Content Block', 'contentBlocks');
const updateContentBlock = updateItem('Content Block', 'contentBlocks');
const deleteContentBlock = deleteItem('Content Block', 'contentBlocks');

// --- Amenity Controllers ---
const addAmenity = addItem('Amenity', 'amenities');
const updateAmenity = updateItem('Amenity', 'amenities');
const deleteAmenity = deleteItem('Amenity', 'amenities');

// --- Service Controllers ---
const addService = addItem('Service', 'services');
const updateService = updateItem('Service', 'services');
const deleteService = deleteItem('Service', 'services');

module.exports = {
  getAboutPage,
  updateAboutUsSection,
  addContentBlock,
  updateContentBlock,
  deleteContentBlock,
  addAmenity,
  updateAmenity,
  deleteAmenity,
  addService,
  updateService,
  deleteService
};
