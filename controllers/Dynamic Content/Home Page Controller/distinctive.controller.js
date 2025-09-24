const cloudinary = require("../../../config/cloudinary");
const streamifier = require("streamifier");
const Distinctive = require("../../../schema/Client Content Models/Home/Distinctive.model");

// CREATE
const addDistinctive = async (req, res) => {
  try {
    const { title, description } = req.body;
    const images = req.files;

    if (!title || !description || !images || images.length === 0) {
      return res.status(400).json({ message: "All fields required" });
    }

    const uploadPromises = images.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "distinctive_features",
            resource_type: "image",
            fetch_format: "auto",
            quality: "auto"
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    });

    const imageUrls = await Promise.all(uploadPromises);

    const newDistinctive = await Distinctive.create({
      title,
      description,
      images: imageUrls,
      page: "home",
      section: "distinctive",
      isActive: true,
    });

    res.status(201).json({ success: true, message: "Distinctive created", data: newDistinctive });
  } catch (error) {
    console.error("Error adding distinctive:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET All
const getDistinctives = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10 for distinctives
    const skip = (page - 1) * limit;

    const distinctives = await Distinctive.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    const total = await Distinctive.countDocuments();

    res.json({
      success: true,
      data: distinctives,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE
const updateDistinctive = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Distinctive.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ success: true, message: "Distinctive updated", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE
const deleteDistinctive = async (req, res) => {
  try {
    const { id } = req.params;
    await Distinctive.findByIdAndDelete(id);
    res.json({ success: true, message: "Distinctive deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addDistinctive, getDistinctives, updateDistinctive, deleteDistinctive };
