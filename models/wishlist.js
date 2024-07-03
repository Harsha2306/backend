const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const wishlistItemSchema = require("./wishlistItem");

const wishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [wishlistItemSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);
