const express = require("express");

const { isAuthorized } = require("../util/isAuthorized");
const userController = require("../controllers/userController");
const passwordChangeValidator = require("../validators/passwordChangeValidator");

const router = express.Router();

router.get("/products", userController.getProducts);
router.get("/product", userController.getProductById);
router.get(
  "/products/recommendedAndNewArrivals",
  userController.getRecommendedAndNewArrivals
);
router.post("/addToCart", isAuthorized, userController.addToCart);
router.post("/removeFromCart", isAuthorized, userController.removeFromCart);
router.post(
  "/removeEntireItemFromCart",
  isAuthorized,
  userController.removeEntireItemFromCart
);
router.post("/addToWishlist", isAuthorized, userController.addToWishlist);
router.post(
  "/removeFromWishlist",
  isAuthorized,
  userController.removeFromWishlist
);
router.get(
  "/checkIfProductPresentInWishlistAndCart",
  userController.checkIfProductPresentInWishlistAndCart
);
router.get("/account", isAuthorized, userController.getUserDetails);
router.post(
  "/changePassword",
  [
    passwordChangeValidator.validateCurrentPassword,
    passwordChangeValidator.validateNewPassword,
    passwordChangeValidator.validateConfirmNewPassword,
  ],
  isAuthorized,
  userController.changePassword
);
router.get("/search", userController.search);
router.get("/wishlist", isAuthorized, userController.getWishlist);
router.get("/cart", isAuthorized, userController.getCart);
router.post("/checkout", isAuthorized, userController.checkout);
router.get("/newOrder", isAuthorized, userController.postOrder);
router.get("/orders", isAuthorized, userController.getOrders);
router.get("/user", isAuthorized, userController.getUserProperties);
router.get("/orderDetails", isAuthorized, userController.getOrderDetails);

module.exports = router;
