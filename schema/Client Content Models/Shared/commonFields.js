module.exports = {
    title: { type: String, required: true, trim: true },
    path: { type: String, required: true },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
};
