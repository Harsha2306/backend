const { check } = require("express-validator");

exports.validateItemName = check("itemName")
  .trim()
  .notEmpty()
  .withMessage("Please fill out this field.")
  .matches(/^[a-zA-Z0-9\s',.!&()#-]+$/)
  .withMessage("Invalid Item name");

exports.validateItemPrice = check("itemPrice")
  .trim()
  .notEmpty()
  .withMessage("Please fill out this field.")
  .matches(/^\d+(\.\d+)?$/)
  .withMessage("Invalid Item price");

exports.validateItemDiscount = check("itemDiscount")
  .trim()
  .notEmpty()
  .withMessage("Please fill out this field.")
  .matches(/^\d+(\.\d+)?$/)
  .withMessage("Invalid Item discount");

exports.validateItemDescription = check("itemDescription")
  .trim()
  .notEmpty()
  .withMessage("Please fill out this field.")
  .matches(/.*/)
  .withMessage("Invalid description");

