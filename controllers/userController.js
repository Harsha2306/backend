const Product = require("../models/product");
const { handleError } = require("../util/handleError");
const Cart = require("../models/cart");
const Wishlist = require("../models/wishlist");
const User = require("../models/user");
const Order = require("../models/order");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { isAuthorizedFlag } = require("../util/isAuthorized");
const stripe = require("stripe")(process.env.STRIPE_SK);

const mongoose = require("mongoose");

exports.getProducts = async (req, res, next) => {
  try {
    // pagination
    const { category, sortBy, min, max, gender } = req.query;
    const page = +req.query.page || 1;
    const perPage = 10;
    const totalProducts = await Product.find().countDocuments();
    if (!totalProducts) {
      throw handleError({
        message: "Can't fetch products",
        statusCode: 500,
        ok: false,
      });
    }

    let categories;
    if (category) categories = category.split(",");

    let query = { itemGender: gender };
    if (categories && categories.length > 0) {
      query.itemCategory = { $in: categories };
    }
    if (min || max) {
      if (!query.discountedPrice) {
        query.discountedPrice = {};
        if (min !== undefined) {
          query.discountedPrice.$gte = min;
        }
        if (max !== undefined) {
          query.discountedPrice.$lte = max;
        }
      }
    }

    let sortOptions = {};
    if (sortBy) {
      if (sortBy === "asc") {
        sortOptions = { discountedPrice: 1 };
      } else if (sortBy === "dsc") {
        sortOptions = { discountedPrice: -1 };
      } else if (sortBy === "latest") {
        sortOptions = { createdAt: -1 };
      }
    }

    const products = await Product.find(query)
      .sort(sortOptions)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const filteredProducts = await Product.find(query).sort(sortOptions);
    const maxPage = Math.ceil(filteredProducts.length / perPage);
    if (page > maxPage) {
      res.status(200).json({
        ok: true,
        products: [],
      });
    }

    if (!products || !filteredProducts) {
      throw handleError({
        message: "Error occured while fetching products",
        statusCode: 500,
        ok: false,
      });
    }

    let pagination = {};
    pagination.previous = page - 1;
    pagination.next = page + 1;
    pagination.first = 1;
    pagination.last = maxPage;
    pagination.filteredProducts = filteredProducts.length;
    pagination.page = page;

    res.status(200).json({
      ok: true,
      products,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    let { productId } = req.query;
    productId = new mongoose.Types.ObjectId(productId);
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw handleError({
        message: "No product found with id " + productId,
        statusCode: 404,
        ok: false,
      });
    }
    const colorsWithImages = [];
    product.itemAvailableColors.map((color, idx) => {
      let colorWithImage = {};
      colorWithImage.color = color;
      colorWithImage.imgs = product.itemAvailableImages.slice(
        6 * idx,
        (idx + 1) * 6
      );
      colorsWithImages.push(colorWithImage);
    });
    const products = await Product.find();
    if (!products) {
      throw handleError({
        message: "No products found",
        statusCode: 404,
        ok: false,
      });
    }
    const randoms = generateDistinctRandomNumbers(0, products.length - 1, 10);
    const relatedProducts = [];
    randoms.map((num) => relatedProducts.push(products[num]));
    res.status(200).json({
      ok: true,
      product,
      colorsWithImages,
      relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecommendedAndNewArrivals = async (req, res, next) => {
  try {
    const products = await Product.find();
    if (!products) {
      throw handleError({
        message: "Can't fetch products",
        statusCode: 500,
        ok: false,
      });
    }
    const limit = Math.floor(products.length / 2);
    const r1 = generateDistinctRandomNumbers(0, limit, 10);
    const r2 = generateDistinctRandomNumbers(
      limit + 1,
      products.length - 1,
      10
    );
    const recommended = [];
    r1.map((num) => recommended.push(products[num]));
    const newArrivals = [];
    r2.map((num) => newArrivals.push(products[num]));
    res.status(200).json({
      ok: true,
      products: { recommended, newArrivals },
    });
  } catch (error) {
    next(error);
  }
};

function generateDistinctRandomNumbers(min, max, count) {
  if (count > max - min + 1) {
    throw new Error(
      "Cannot generate more distinct random numbers than the range allows."
    );
  }
  const numbers = [];
  for (let i = min; i <= max; i++) {
    numbers.push(i);
  }
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers.slice(0, count);
}

exports.addToCart = async (req, res, next) => {
  const productId = new mongoose.Types.ObjectId(req.body.productId);
  const { size, color } = req.body;
  const userId = new mongoose.Types.ObjectId(req.userId);
  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw handleError({
        message: "No product found",
        statusCode: 404,
        ok: false,
      });
    }
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );
    if (itemIndex === -1) {
      cart.items.unshift({
        productId: productId,
        quantity: 1,
        size,
        color,
      });
    } else {
      const cartItem = cart.items[itemIndex];
      cartItem.quantity += 1;
    }
    const updatedCart = await cart.save();
    if (!updatedCart) {
      throw handleError({
        message: "Can't update cart",
        statusCode: 500,
        ok: false,
      });
    }
    res.status(201).json({
      ok: true,
      cartLength: updatedCart.items.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.body.productId);
    const { size, color } = req.body;
    const userId = new mongoose.Types.ObjectId(req.userId);
    let cart = await Cart.findOne({ userId });
    if (!cart)
      throw handleError({
        message: "No cart found",
        statusCode: 404,
        ok: false,
      });
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw handleError({
        message: "No product found",
        statusCode: 404,
        ok: false,
      });
    }
    const requiredItemIdx = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );
    if (requiredItemIdx === -1) {
      return res.status(404).json({
        message: "Item not found in cart",
        ok: false,
      });
    }
    if (cart.items[requiredItemIdx].quantity === 1)
      cart.items.splice(requiredItemIdx, 1);
    else {
      cart.items[requiredItemIdx].quantity--;
    }
    const updatedCart = await cart.save();
    if (!updatedCart)
      throw handleError({
        message: "updated cart not saved",
        statusCode: 500,
        ok: false,
      });
    if (updatedCart.items.length === 0)
      await Cart.deleteOne({
        _id: updatedCart._id,
      });
    res.status(200).json({
      ok: true,
      cartLength: updatedCart.items.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeEntireItemFromCart = async (req, res, next) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.body.productId);
    const { size, color } = req.body;
    const userId = new mongoose.Types.ObjectId(req.userId);
    let cart = await Cart.findOne({ userId });
    if (!cart)
      throw handleError({
        message: "No cart found",
        statusCode: 404,
        ok: false,
      });
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw handleError({
        message: "No product found",
        statusCode: 404,
        ok: false,
      });
    }
    const requiredItemIdx = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );
    if (requiredItemIdx === -1) {
      throw handleError({
        message: "Item not found in cart",
        statusCode: 404,
        ok: false,
      });
    }
    cart.items.splice(requiredItemIdx, 1);
    const updatedCart = await cart.save();
    if (!updatedCart)
      throw handleError({
        message: "unable to save cart",
        statusCode: 500,
        ok: false,
      });
    if (updatedCart.items.length === 0)
      await Cart.deleteOne({
        _id: updatedCart._id,
      });
    res.status(200).json({
      ok: true,
      cartLength: updatedCart.items.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.addToWishlist = async (req, res, next) => {
  const productId = new mongoose.Types.ObjectId(req.body.productId);
  const { size, color } = req.body;
  const userId = new mongoose.Types.ObjectId(req.userId);
  try {
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw handleError({
        message: "No product found",
        statusCode: 404,
        ok: false,
      });
    }
    let itemPrice = product.itemPrice;
    const hasDiscount = product.itemDiscount === 0 ? false : true;
    if (hasDiscount) {
      itemPrice = Math.round(product.discountedPrice);
    }
    const item = wishlist.items.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );
    if (item === undefined) {
      wishlist.items.unshift({
        productId: productId,
        price: itemPrice,
        size,
        color,
      });
    }
    const updatedWishlist = await wishlist.save();
    if (!updatedWishlist) {
      throw handleError({
        message: "Can't update Wishlist",
        statusCode: 500,
        ok: false,
      });
    }
    res.status(201).json({
      ok: true,
      wishlistLength: updatedWishlist.items.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const itemId = new mongoose.Types.ObjectId(req.body.productId);
    const userId = new mongoose.Types.ObjectId(req.userId);
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw handleError({
        message: "No wishlist found",
        statusCode: 404,
        ok: false,
      });
    }
    const itemIdx = wishlist.items.findIndex(
      (item) => itemId.toString() === item._id.toString()
    );
    if (itemIdx === -1)
      throw handleError({
        message: "No item found in wishlist",
        statusCode: 404,
        ok: false,
      });
    wishlist.items.splice(itemIdx, 1);
    const updatedWishlist = await wishlist.save();
    res.status(200).json({
      ok: true,
      wishlistLength: updatedWishlist.items.length,
    });
    if (updatedWishlist.items.length === 0) {
      await Wishlist.findByIdAndDelete(updatedWishlist._id);
    }
  } catch (error) {
    next(error);
  }
};

exports.checkIfProductPresentInWishlistAndCart = async (req, res, next) => {
  const { productId, selectedSize = "", selectedColor } = req.query;
  let addedToWishList, addedToCart;
  try {
    if (isAuthorizedFlag(req)) {
      const userId = new mongoose.Types.ObjectId(req.userId);
      if (productId && selectedColor) {
        const wishList = await Wishlist.findOne({ userId });
        if (wishList) {
          addedToWishList = wishList.items.find(
            (item) =>
              item.productId.toString() === productId &&
              item.size === selectedSize &&
              item.color === selectedColor
          );
        }
        const cart = await Cart.findOne({ userId });
        if (cart) {
          addedToCart = cart.items.find(
            (item) =>
              item.productId.toString() === productId &&
              item.size === selectedSize &&
              item.color === selectedColor
          );
        }
      }
    }
    res.status(200).json({
      ok: true,
      addedToWishList: addedToWishList !== undefined,
      addedToCart: addedToCart !== undefined,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const user = await User.findOne({ _id: userId });
    if (!user)
      throw handleError({
        message: "No user found",
        statusCode: 404,
        ok: false,
      });
    res.status(200).json({
      ok: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorFields = errors.array().map((err) => {
        return { field: err.path, errorMessage: err.msg };
      });
      throw handleError({
        message: "Validation Error",
        statusCode: 422,
        errorFields,
        ok: false,
      });
    }
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword)
      throw handleError({
        message: "Validation Error",
        statusCode: 422,
        errorFields: [
          {
            field: "newPassword",
            errorMessage:
              "New password doesn't match with confirm new password",
          },
        ],
        ok: false,
      });
    const userId = new mongoose.Types.ObjectId(req.userId);
    const user = await User.findOne({ _id: userId });
    if (!user)
      throw handleError({
        message: "No user found",
        statusCode: 404,
        ok: false,
      });
    const checkPassword = await bcrypt.compare(currentPassword, user.password);
    if (!checkPassword) {
      throw handleError({
        message: "password not found",
        statusCode: 404,
        ok: false,
        errorFields: [
          {
            field: "currentPassword",
            errorMessage: "Please check your password",
          },
        ],
      });
    }
    const updatedHashedPassword = await bcrypt.hash(newPassword, 12);
    if (!updatedHashedPassword) {
      throw handleError({
        message: "Internal server errir",
        statusCode: 500,
        ok: false,
      });
    }
    user.password = updatedHashedPassword;
    const savedUser = await user.save();
    if (!savedUser)
      throw handleError({
        ok: false,
        statusCode: 500,
      });
    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.search = async (req, res, next) => {
  try {
    const text = req.query.search;
    let products, trendingSearchs;
    if (text.trim().length === 0) {
      products = [];
    } else {
      const regex = new RegExp(text, "i");
      products = await Product.find({
        itemName: { $regex: regex },
      });
      if (!products)
        throw handleError({
          ok: false,
          statusCode: 404,
        });
    }
    const trendingProducts = await Product.aggregate([
      { $sample: { size: 6 } },
    ]);
    trendingSearchs = trendingProducts.map((product) => ({
      _id: product._id,
      itemName: product.itemName,
    }));
    res.status(200).json({
      ok: true,
      products,
      trendingSearchs,
    });
  } catch (error) {
    next(error);
  }
};

exports.getWishlist = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const wishlist = await Wishlist.findOne({ userId: userId }).populate({
      path: "items.productId",
      model: "product",
    });
    if (!wishlist)
      throw handleError({
        message: "No wishlist found",
        statusCode: 404,
        ok: false,
      });
    const productIds = wishlist.items.map((item) => item.productId._id);
    const products = await Product.find({ _id: { $in: productIds } });
    const wishlistProds = wishlist.items.map((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId._id.toString()
      );
      const idx = product.itemAvailableColors.findIndex(
        (color) => color === item.color
      );
      let itemPrice = product.itemPrice;
      if (product.itemDiscount > 0) {
        itemPrice = Math.round(product.discountedPrice);
      }
      const img = idx !== -1 ? product.itemAvailableImages[6 * idx] : null;
      return {
        _id: item._id,
        productId: product._id,
        name: product.itemName,
        img,
        color: item.color,
        size: item.size,
        price: itemPrice,
        available: product.available,
      };
    });
    res.status(200).json({
      ok: true,
      wishlist: wishlistProds,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: "product",
    });
    if (!cart) {
      throw handleError({
        message: "No cart found",
        statusCode: 404,
        ok: false,
      });
    }
    const productIds = cart.items.map((item) => item.productId._id);
    const products = await Product.find({ _id: { $in: productIds } });
    let totalPrice = 0;
    let inStock = 0;
    const cartItems = cart.items.map((item) => {
      const idx = item.productId.itemAvailableColors.findIndex(
        (color) => color === item.color
      );
      const product = products.find(
        (p) => p._id.toString() === item.productId._id.toString()
      );
      let itemPrice = product.itemPrice;
      if (product.itemDiscount > 0) {
        itemPrice = Math.round(product.discountedPrice);
      }
      const price = itemPrice * item.quantity;
      if (product.available) {
        inStock++;
        totalPrice += price;
      }
      return {
        name: item.productId.itemName,
        img: item.productId.itemAvailableImages[6 * idx],
        color: item.color,
        size: item.size,
        price,
        _id: item._id,
        quantity: item.quantity,
        productId: item.productId._id,
        available: product.available,
      };
    });
    res.status(200).json({
      ok: true,
      cart: { items: cartItems, totalPrice },
      inStock,
    });
  } catch (error) {
    next(error);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const cart = await Cart.findOne({ userId });
    if (!cart)
      throw handleError({
        message: "Cart not found",
        statusCode: 404,
        ok: false,
      });
    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productIdNameMap = new Map();
    const productIdDiscountPrice = new Map();
    const productAvailableMap = new Map();

    products.forEach((product) => {
      productIdNameMap.set(product._id.toString(), product.itemName);
      productIdDiscountPrice.set(
        product._id.toString(),
        Math.round(product.discountedPrice)
      );
      productAvailableMap.set(product._id.toString(), product.available);
    });

    const orderedItems = cart.items
      .filter((item) => productAvailableMap.get(item.productId.toString()))
      .map((item) => {
        return {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: Math.round(
            item.quantity *
              productIdDiscountPrice.get(item.productId.toString())
          ),
        };
      });

    // stripe required structure
    const lineItems = orderedItems.map((product) => ({
      price_data: {
        currency: "INR",
        product_data: {
          name: productIdNameMap.get(product.productId.toString()),
        },
        unit_amount: (product.price * 100) / product.quantity,
      },
      quantity: product.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.BASE_URL}/payment-success`,
      cancel_url: `${process.env.BASE_URL}/cart`,
    });

    res.status(201).json({
      message: "Payment session created",
      ok: true,
      sessionId: session.id,
    });
  } catch (error) {
    next(error);
  }
};

exports.postOrder = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const cart = await Cart.findOne({ userId });
    if (!cart)
      throw handleError({
        message: "Cart not found",
        statusCode: 404,
        notAvailableProductIds,
        ok: false,
      });
    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productIdNameMap = new Map();
    const productIdDiscountPrice = new Map();
    const productAvailableMap = new Map();

    products.forEach((product) => {
      productIdNameMap.set(product._id.toString(), product.itemName);
      productIdDiscountPrice.set(
        product._id.toString(),
        Math.round(product.discountedPrice)
      );
      productAvailableMap.set(product._id.toString(), product.available);
    });
    const items = cart.items;
    const orderedItems = items
      .filter((item) => productAvailableMap.get(item.productId.toString()))
      .map((item) => {
        return {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: Math.round(
            item.quantity *
              productIdDiscountPrice.get(item.productId.toString())
          ),
        };
      });

    const order = new Order({ userId, items: orderedItems });
    const savedOrder = await order.save();
    if (!savedOrder)
      throw handleError({
        message: "Error occurred while saving order",
        statusCode: 500,
        ok: false,
      });
    cart.items = items.filter(
      (item) => !productAvailableMap.get(item.productId.toString())
    );
    const updatedCart = await cart.save();
    if (!updatedCart)
      throw handleError({
        message: "cart not saved",
        statusCode: 404,
        notAvailableProductIds,
        ok: false,
      });
    res.status(201).json({
      message: "Order created successfully",
      ok: true,
      cartLength: 0,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    const ordersDetails = orders.map((order) => ({
      orderId: order._id,
      orderedAt: new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(order.createdAt)),
    }));

    res.status(200).json({
      ok: true,
      orders: ordersDetails,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserProperties = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const cart = await Cart.findOne({ userId });
    const wishlist = await Wishlist.findOne({ userId });
    const cartCount = cart ? cart.items.length : 0;
    const wishlistCount = wishlist ? wishlist.items.length : 0;
    res.status(200).json({
      ok: true,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const orderId = new mongoose.Types.ObjectId(req.query.orderId);
    const order = await Order.findOne({ _id: orderId });
    const productIds = order.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productIdNameMap = new Map();
    products.forEach((product) => {
      productIdNameMap.set(product._id.toString(), product.itemName);
    });

    let total = 0;
    const productsWithPrices = order.items.map((item) => {
      total += item.price;
      return {
        name: productIdNameMap.get(item.productId.toString()),
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
      };
    });

    res.status(200).json({
      ok: true,
      productsWithPrices,
      total,
      createdAt: new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(order.createdAt)),
      id: order._id,
    });
  } catch (error) {
    next(error);
  }
};
