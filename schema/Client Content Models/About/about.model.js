const mongoose = require('mongoose');

// This schema represents an image, typically one that would be uploaded to a cloud service like Cloudinary.
// It stores the secure URL for displaying the image and the public_id for any management operations (like deletion).
const ImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    required: true,
  },
});

// This schema defines the structure for the main "About Us" section of the page.
// It includes a title, a header image, and a descriptive text.
const AboutUsSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  headerImage: ImageSchema,
  description: {
    type: String,
    required: true,
  },
});

// This schema is for the "Content Blocks" that appear on the page.
// Each block has a title, an associated image, and a description.
const ContentBlockSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  image: ImageSchema,
  description: {
    type: String,
    required: true,
  },
});

// This schema defines the structure for the "Our Amenities" section.
// Each amenity is represented by a title, an image, and a short description.
const AmenitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  image: ImageSchema,
  description: {
    type: String,
    required: true,
  },
});

// This schema is for the "Our Exceptional Services" section.
// Similar to amenities, each service has a title, an image, and a description.
const ServiceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  image: ImageSchema,
  description: {
    type: String,
    required: true,
  },
});

// This is the main schema for the entire "About Us" page.
// It consolidates all the different sections into a single document.
// Using this approach, you can manage the content of the whole page with a single database entry.
const AboutPageSchema = new mongoose.Schema(
  {
    aboutUsSection: AboutUsSectionSchema,
    contentBlocks: [ContentBlockSchema],
    amenities: [AmenitySchema],
    services: [ServiceSchema],
  },
  {
    // The timestamps option automatically adds `createdAt` and `updatedAt` fields to the document.
    timestamps: true,
  }
);

const AboutPage = mongoose.model('AboutPage', AboutPageSchema);

module.exports = AboutPage;
