const FooterLink = require("../../../schema/Client Content Models/Home/FooterLink.model");

// add all footer links
async function addFooterLinks(req, res) {
    try {
        const { title, path } = req.body;

        // Check if footer link already exists
        const existingLink = await FooterLink.findOne({ title });
        if (existingLink) {
            return res.status(400).json({ message: 'Footer link already exists' });
        }
        // Create new footer link
        const newFooterLink = await FooterLink.create({
            title,
            path
        });
        res.status(201).json({
            success: true,
            message: 'Footer link added successfully',
            footerLink: newFooterLink
        });
    } catch (error) {
        console.error('Error adding footer link:', error);
        res.status(500).json({ message: 'Server error while adding footer link' });
    }
}

// get all footer links
async function getFooterLinks(req, res) {
    try {
        const footerLinks = await FooterLink.find().sort({ order: 1 });
        res.status(200).json({
            success: true,
            footerLinks
        });
    } catch (error) {
        console.error('Error fetching footer links:', error);
        res.status(500).json({ message: 'Server error while fetching footer links' });
    }
}

// update footer link
async function updateFooterLink(req, res) {
    try {
        const { id } = req.params;
        const { title, path } = req.body;

        // Check if footer link exists
        const footerLink = await FooterLink.findById(id);
        if (!footerLink) {
            return res.status(404).json({ message: 'Footer link not found' });
        }
        // Update footer link
        footerLink.title = title || footerLink.title;
        footerLink.path = path || footerLink.path;
        await footerLink.save();
        res.status(200).json({
            success: true,
            message: 'Footer link updated successfully',
            footerLink
        });
    } catch (error) {
        console.error('Error updating footer link:', error);
        res.status(500).json({ message: 'Server error while updating footer link' });
    }
}

// delete footer link
async function deleteFooterLink(req, res) {
    try {
        const { id } = req.params;

        // Check if footer link exists
        const footerLink = await FooterLink.findById(id);
        if (!footerLink) {
            return res.status(404).json({ message: 'Footer link not found' });
        }
        // Delete footer link
        await FooterLink.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Footer link deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting footer link:', error);
        res.status(500).json({ message: 'Server error while deleting footer link' });
    }
}


module.exports = { addFooterLinks, getFooterLinks, updateFooterLink, deleteFooterLink };