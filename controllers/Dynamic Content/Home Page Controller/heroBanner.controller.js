const cloudinary = require('../../../config/cloudinary');
const streamifier = require('streamifier');

// functions for home page content management
const HeroBannerModel = require("../../../schema/Client Content Models/Home/HeroBanner.model");
const asyncHandler = require('async-handler');

// ADD hero banner function
async function addHeroBanner(req, res) {
    try {
        const { title, subtitle, description, url } = req.body;
        const imageFile = req.file;

        // ✅ Validation
        if (!title || !description || !url || !imageFile) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Cloudinary Upload (stream)
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "hero_banners",
                resource_type: "image",
            },
            async (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return res
                        .status(500)
                        .json({ message: "Error uploading image to Cloudinary" });
                }

                // ✅ Save to DB with Cloudinary URL
                const heroBanner = await HeroBannerModel.create({
                    title,
                    subtitle,
                    description,
                    image: result.secure_url,
                    url,
                    page: "home",
                    section: "hero",
                    isActive: true,
                });

                res.status(201).json({
                    success: true,
                    message: "Hero banner added successfully",
                    heroBanner,
                });
            }
        );

        // ✅ Pipe buffer to Cloudinary
        streamifier.createReadStream(imageFile.buffer).pipe(uploadStream);
    } catch (error) {
        console.error("Error adding hero banner:", error);
        res.status(500).json({ message: "Server error while adding hero banner" });
    }
}


// // updateHeroBanner function
// const addHeroBanner = asyncHandler(async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ success: false, message: "No file uploaded" });
//   }

//   const stream = cloudinary.uploader.upload_stream(
//     {
//       folder: "hero_banners",
//       resource_type: "image",
//       transformation: [
//         { quality: "auto", fetch_format: "auto" }, // ✅ Cloudinary optimization
//       ],
//     },
//     async (error, result) => {
//       if (error) {
//         return res.status(500).json({ success: false, message: error.message });
//       }

//       const newBanner = await HeroBanner.create({
//         title: req.body.title,
//         subtitle: req.body.subtitle,
//         description: req.body.description,
//         image: result.secure_url,
//         url: req.body.url,
//       });

//       res.status(201).json({ success: true, data: newBanner });
//     }
//   );

//   stream.end(req.file.buffer);
// });
const updateHeroBanner = (async (req, res) => {
    const banner = await HeroBannerModel.findById(req.params.id);

    if (!banner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (req.file) {
        // upload new image to Cloudinary
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "hero_banners",
                resource_type: "image",
                transformation: [
                    { quality: "auto", fetch_format: "auto" },
                ],
            },
            async (error, result) => {
                if (error) {
                    return res.status(500).json({ success: false, message: error.message });
                }

                banner.image = result.secure_url;
                banner.title = req.body.title || banner.title;
                banner.subtitle = req.body.subtitle || banner.subtitle;
                banner.description = req.body.description || banner.description;
                banner.url = req.body.url || banner.url;

                await banner.save();

                res.json({ success: true, data: banner });
            }
        );

        stream.end(req.file.buffer);
    } else {
        // no new image, update text only
        banner.title = req.body.title || banner.title;
        banner.subtitle = req.body.subtitle || banner.subtitle;
        banner.description = req.body.description || banner.description;
        banner.url = req.body.url || banner.url;

        await banner.save();

        res.json({ success: true, data: banner });
    }
});


// deleteHeroBanner function
async function deleteHeroBanner(req, res) {
    try {
        const { id } = req.params;

        // Find the hero banner by ID
        const heroBanner = await HeroBannerModel.findById(id);
        if (!heroBanner) {
            return res.status(404).json({ message: 'Hero banner not found' });
        }
        // Delete the hero banner
        await heroBanner.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Hero banner deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting hero banner:', error);
        res.status(500).json({ message: 'Server error while deleting hero banner' });
    }
}

// getHeroBanner function
async function getHeroBanner(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit to 10 for banners
        const skip = (page - 1) * limit;

        const heroBanners = await HeroBannerModel.find({ page: 'home', section: 'hero' })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); // Sort by newest first

        const total = await HeroBannerModel.countDocuments({ page: 'home', section: 'hero' });

        res.status(200).json({
            success: true,
            heroBanners,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching hero banners:', error);
        res.status(500).json({ message: 'Server error while fetching hero banners' });
    }
}


module.exports = { addHeroBanner, updateHeroBanner, deleteHeroBanner, getHeroBanner }