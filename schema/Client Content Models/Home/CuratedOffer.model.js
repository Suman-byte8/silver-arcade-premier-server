const mongoose = require("mongoose");
const commonFields = require("../Shared/commonFields");

const curatedOfferSchema = new mongoose.Schema(
  {
    ...commonFields,
    image: { type: String, required: true },
    description: { type: String, required: true },
    details: [{ type: String }],
    page: { type: String, default: "home" },
    section: { type: String, default: "curatedOffers" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CuratedOffer", curatedOfferSchema);
