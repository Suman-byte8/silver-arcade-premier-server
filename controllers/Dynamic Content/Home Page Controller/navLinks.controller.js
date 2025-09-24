const navLinks = require('../../../schema/Client Content Models/Home/NavLinks.model')

// Add Nav Link
async function addNavLink(req, res) {
    try {
        const { title, path, icon, order } = req.body;

        // Create new nav link
        const newNavLink = new navLinks({
            title,
            path,
            icon,
            order: order || 0
        });

        await newNavLink.save();

        res.status(201).json({
            success: true,
            message: 'Nav Link added successfully',
            data: newNavLink
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding Nav Link',
            error: error.message
        });
    }
}

// Update Nav Link
async function updateNavLink(req, res) {
        try {
        const { id } = req.params;
        const { title, path, icon, order } = req.body;
        const navLink = await navLinks.findById(id);
        if (!navLink) {
            return res.status(404).json({ message: 'Nav Link not found' });
        }
        navLink.title = title || navLink.title;
        navLink.path = path || navLink.path;
        navLink.icon = icon || navLink.icon;
        navLink.order = order || navLink.order;
        await navLink.save();
        res.status(200).json({
            success: true,
            message: 'Nav Link updated successfully',
            data: navLink
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating Nav Link',
            error: error.message
        });
    }
}

// Delete Nav Link
async function deleteNavLink(req, res) {
    try {
        const { id } = req.params;
        const navLink = await navLinks.findByIdAndDelete(id);
        if (!navLink) {
            return res.status(404).json({ message: 'Nav Link not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Nav Link deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting Nav Link',
            error: error.message
        });
    }
}

//  Get Nav Links
async function getNavLinks(req, res) {
    try {
        const navLinksList = await navLinks.find().sort({ order: 1 });
        res.status(200).json({
            success: true,
            data: navLinksList
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching Nav Links',
            error: error.message
        });
    }
}
module.exports = { addNavLink, updateNavLink, deleteNavLink, getNavLinks };