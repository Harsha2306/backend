const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = require("./orderItem");

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Orders", orderSchema);
