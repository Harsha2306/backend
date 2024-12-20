const express = require("express");
const { isAuthorized } = require("../util/isAuthorized");

const adminController = require("../controllers/adminController");
const adminValidator = require("../validators/adminValidator");

const router = express.Router();

router.get("/", isAuthorized, adminController.getAllProducts);
router.post(
  "/add-product",
  isAuthorized,
  [
    adminValidator.validateItemName,
    adminValidator.validateItemPrice,
    adminValidator.validateItemDiscount,
    adminValidator.validateItemDescription,
  ],
  adminController.postProduct
);
router.get("/product/:productId", isAuthorized, adminController.getProductById);
router.post(
  "/updateOrderStatus",
  isAuthorized,
  [adminValidator.validateOrderStatus],
  adminController.postOrderStatus
);
router.get("/orders", isAuthorized, adminController.getAllOrders)

module.exports = router;
