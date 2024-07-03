const mongoose = require("mongoose");
const Product = require("./models/product"); // Update the path to your product model

const dbURI =
  "mongodb+srv://harsharevanth5:L8dnP66EuVwekvlM@cluster0.9hzxydh.mongodb.net/ecommerce"; // Update with your database URI

mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    updateDiscountedPrice();
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

async function updateDiscountedPrice() {
    try {
        const products = await Product.find();
        for (let product of products) {
            const discountAmount = (product.itemPrice * product.itemDiscount) / 100;
            product.discountedPrice = Math.round(product.itemPrice - discountAmount);
            await product.save();
            console.log(`Updated product ${product._id} with discounted price: ${product.discountedPrice}`);
        }
        console.log('All products have been updated.');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error updating products:', error);
        mongoose.connection.close();
    }

}

const updateProducts = async () => {
  try {
    // Connect to your MongoDB database
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Update all existing products to set available to true if it's not set
    await Product.updateMany(
      { available: { $exists: false } },
      { $set: { available: true } }
    );

    console.log(
      "All existing products updated to include 'available' field set to true"
    );

    // Close the database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error updating products:", error);
    process.exit(1);
  }
};

updateProducts();