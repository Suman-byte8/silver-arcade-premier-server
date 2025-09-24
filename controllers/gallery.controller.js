const GalleryImage = require('../schema/gallery.model');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { optimizeImage } = require('../utilities/optimize-image');

// Helper function to upload optimized image to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'gallery' },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Get gallery images, optionally filtered by tab
exports.getGalleryImages = async (req, res) => {
  try {
    const tab = req.query.tab;
    const filter = tab ? { tab } : {};
    const images = await GalleryImage.find(filter).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ message: 'Server error fetching gallery images' });
  }
};

// Add new gallery image
exports.addGalleryImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image file is required' });
    }

    const tab = req.body.tab || 'Rooms';
    const title = req.body.title || '';
    const caption = req.body.caption || '';

    // Validate file sizes (allow up to 10MB, will optimize to 1MB)
    for (const file of req.files) {
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: 'Each image size must be less than 10MB' });
      }
    }

    const uploadedImages = [];

    for (const file of req.files) {
      // Create temp directory
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-upload-'));
      const inputPath = path.join(tmpDir, 'input.jpg');
      const outputPath = path.join(tmpDir, 'optimized.jpg');

      try {
        // Write buffer to temp file
        await fs.writeFile(inputPath, file.buffer);

        // Optimize image to 1MB (1024KB)
        const optResult = await optimizeImage(inputPath, outputPath, 1024);

        if (!optResult.success && optResult.finalSizeKB > 1024) {
          console.warn(`Optimization did not reach target: ${optResult.message}`);
        }

        // Read optimized file
        const optimizedBuffer = await fs.readFile(outputPath);

        // Upload to Cloudinary
        const result = await uploadToCloudinary(optimizedBuffer);
        const newImage = new GalleryImage({
          url: result.secure_url,
          public_id: result.public_id,
          tab,
          title,
          caption,
        });
        await newImage.save();
        uploadedImages.push(newImage);
      } finally {
        // Cleanup temp files
        await fs.remove(tmpDir).catch(() => {});
      }
    }

    res.status(201).json(uploadedImages);
  } catch (error) {
    console.error('Error adding gallery images:', error);
    res.status(500).json({ message: 'Server error adding gallery images' });
  }
};

// Update gallery image metadata and optionally image file
exports.updateGalleryImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const { title, caption, tab } = req.body;

    const image = await GalleryImage.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    if (req.file) {
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: 'Image size must be less than 10MB' });
      }
      // Create temp directory
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-update-'));
      const inputPath = path.join(tmpDir, 'input.jpg');
      const outputPath = path.join(tmpDir, 'optimized.jpg');

      try {
        // Write buffer to temp file
        await fs.writeFile(inputPath, req.file.buffer);

        // Optimize image to 1MB (1024KB)
        const optResult = await optimizeImage(inputPath, outputPath, 1024);

        if (!optResult.success && optResult.finalSizeKB > 1024) {
          console.warn(`Optimization did not reach target: ${optResult.message}`);
        }

        // Read optimized file
        const optimizedBuffer = await fs.readFile(outputPath);

        // Delete old image from Cloudinary
        await cloudinary.uploader.destroy(image.public_id);
        // Upload new image
        const result = await uploadToCloudinary(optimizedBuffer);
        image.url = result.secure_url;
        image.public_id = result.public_id;
      } finally {
        // Cleanup temp files
        await fs.remove(tmpDir).catch(() => {});
      }
    }

    if (title !== undefined) image.title = title;
    if (caption !== undefined) image.caption = caption;
    if (tab !== undefined) image.tab = tab;

    await image.save();

    res.json(image);
  } catch (error) {
    console.error('Error updating gallery image:', error);
    res.status(500).json({ message: 'Server error updating gallery image' });
  }
};

// Delete gallery image
exports.deleteGalleryImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await GalleryImage.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(image.public_id);
    // Delete from DB
    await image.deleteOne();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ message: 'Server error deleting gallery image' });
  }
};
