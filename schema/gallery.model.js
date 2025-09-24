const mongoose = require('mongoose');

// Schema for storing image details with Cloudinary info
const ImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  caption: {
    type: String,
    default: '',
  },
  tab: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const GalleryImage = mongoose.model('GalleryImage', ImageSchema);

module.exports = GalleryImage;
