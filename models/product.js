const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    itemName: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    itemDiscount: { type: Number, required: true },
    itemDescription: { type: String, required: true },
    itemTag: { type: String },
    itemCategory: { type: String, required: true },
    itemGender: { type: String, required: true },
    itemAvailableSizes: [{ type: String, required: true }],
    itemAvailableColors: [{ type: String, required: true }],
    itemAvailableImages: [{ type: String, required: true }],
    discountedPrice: { type: Number },
    available: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

productSchema.methods.getDiscountedPrice = function () {
  if (this.itemDiscount && this.itemDiscount > 0) {
    const discountAmount = (this.itemPrice * this.itemDiscount) / 100;
    return this.itemPrice - discountAmount;
  }
  return this.itemPrice;
};

productSchema.pre("save", function (next) {
  this.discountedPrice = this.getDiscountedPrice();
  next();
});

module.exports = mongoose.model("product", productSchema);