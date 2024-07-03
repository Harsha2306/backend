const { check } = require("express-validator");

exports.validateCurrentPassword = check("currentPassword")
  .trim()
  .notEmpty()
  .withMessage("current password cannot be empty")
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
  .withMessage(
    "current password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
  );

exports.validateNewPassword = check("newPassword")
  .trim()
  .notEmpty()
  .withMessage("new password cannot be empty")
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
  .withMessage(
    "new password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
  );

exports.validateConfirmNewPassword = check("confirmNewPassword")
  .trim()
  .notEmpty()
  .withMessage("confirm new password cannot be empty")
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
  .withMessage(
    "confirm new password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
  );

