const memberShipBlock = require('../../../schema/Client Content Models/Home/MembershipBlock.model');
const cloudinary = require('../../../config/cloudinary');
const streamifier = require('streamifier');

// Add Membership Block
async function addMembershipBlock(req, res) {
    try {
        const { title, description, url } = req.body;
        const imageFile = req.file;

        // Validate required fields
        if (!title || !description || !url || !imageFile) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Upload image to Cloudinary using a stream
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'membership_blocks',
                resource_type: 'image'
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ message: 'Error uploading image to Cloudinary' });
                }

                // Create new membership block
                const newMembershipBlock = await memberShipBlock.create({
                    title,
                    description,
                    image: result.secure_url,
                    url
                });

                res.status(201).json({
                    success: true,
                    message: 'Membership Block added successfully',
                    data: newMembershipBlock
                });
            }
        );

        // Pipe the file buffer into the Cloudinary upload stream
        streamifier.createReadStream(imageFile.buffer).pipe(uploadStream);

    } catch (error) {
        console.error('Error adding membership block:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// update Membership Block
async function updateMembershipBlock(req, res) {
    try {
        const { id } = req.params;
        const { title, description, url } = req.body;
        const imageFile = req.file;

        // Validate required fields
        if (!title || !description || !url) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const finalUpdate = async (imageUrl) => {
            const updateData = { title, description, url };
            if (imageUrl) {
                updateData.image = imageUrl;
            }

            // Find and update membership block
            const updatedMembershipBlock = await memberShipBlock.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );

            if (!updatedMembershipBlock) {
                return res.status(404).json({ message: 'Membership Block not found' });
            }

            res.status(200).json({
                success: true,
                message: 'Membership Block updated successfully',
                data: updatedMembershipBlock
            });
        };

        if (imageFile) {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'membership_blocks',
                    resource_type: 'image'
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return res.status(500).json({ message: 'Error uploading image to Cloudinary' });
                    }
                    finalUpdate(result.secure_url);
                }
            );
            streamifier.createReadStream(imageFile.buffer).pipe(uploadStream);
        } else {
            finalUpdate();
        }

    } catch (error) {
        console.error('Error updating membership block:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// delete Membership Block
async function deleteMembershipBlock(req, res) {
    try {
        const { id } = req.params;
        const deletedMembershipBlock = await memberShipBlock.findByIdAndDelete(id);
        if (!deletedMembershipBlock) {
            return res.status(404).json({ message: 'Membership Block not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Membership Block deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting membership block:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

// get all Membership Blocks
async function getMembershipBlocks(req, res) {
    try {
        const membershipBlocks = await memberShipBlock.find();
        res.status(200).json({
            success: true,
            data: membershipBlocks
        });
    } catch (error) {
        console.error('Error fetching membership blocks:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = { addMembershipBlock, updateMembershipBlock, deleteMembershipBlock, getMembershipBlocks };