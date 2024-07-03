const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 }
});

module.exports = cartItemSchema;
