const User = require("../models/user");

const { check } = require("express-validator");

exports.validateFirstName = check("firstName")
  .trim()
  .notEmpty()
  .withMessage(
    "First name should contain at least 3 characters (no numbers, spaces, or special characters)."
  )
  .isLength({ min: 3 })
  .withMessage(
    "First name should contain at least 3 characters (no numbers, spaces, or special characters)."
  )
  .matches(/^[a-zA-Z]+$/)
  .withMessage(
    "First name should contain at least 3 characters (no numbers, spaces, or special characters)."
  );

exports.validateLastName = check("lastName")
  .trim()
  .notEmpty()
  .withMessage(
    "Last name should contain at least 3 characters (no numbers, spaces, or special characters)."
  )
  .isLength({ min: 3 })
  .withMessage(
    "Last name should contain at least 3 characters (no numbers, spaces, or special characters)."
  )
  .matches(/^[a-zA-Z]+$/)
  .withMessage(
    "Last name should contain at least 3 characters (no numbers, spaces, or special characters)."
  );

exports.validateEmail = check("email")
  .trim()
  .notEmpty()
  .withMessage("You need to have a valid email.")
  .isEmail()
  .withMessage("You need to have a valid email.")
  .custom(async (value) => {
    const existingUser = await User.findOne({ email: value });
    if (existingUser)
      throw new Error("A user already exists with this e-mail address");
  });

exports.validatePassword = check("password")
  .trim()
  .notEmpty()
  .withMessage(
    "Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
  )
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
  .withMessage(
    "Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
  );

exports.validateLoginCredentials = [
  check("email")
    .trim()
    .notEmpty()
    .withMessage("You need to have a valid email.")
    .isEmail()
    .withMessage("You need to have a valid email."),
  check("password")
    .trim()
    .notEmpty()
    .withMessage(
      "Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
    )
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .withMessage(
      "Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, and one digit."
    ),
];

exports.validateEmailForForgotPassword = check("email")
  .trim()
  .notEmpty()
  .withMessage("You need to have a valid email.")
  .isEmail()
  .withMessage("You need to have a valid email.")
  .custom(async (value) => {
    const existingUser = await User.findOne({ email: value });
    if (!existingUser)
      throw new Error("No user found with this e-mail address");
  });
