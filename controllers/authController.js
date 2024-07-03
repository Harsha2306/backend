const User = require("../models/user");
const Cart = require("../models/cart");
const Wishlist = require("../models/wishlist");
const { handleError } = require("../util/handleError");

require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

exports.registerUser = async (req, res, next) => {
  try {
    // used to store errors thrown from validator functions
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
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    if (!hashedPassword) {
      throw handleError({
        message: "Error occured while hashing password",
        statusCode: 422,
        ok: false,
      });
    }
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    const savedUser = await user.save();
    if (!savedUser) {
      throw handleError({
        message: "Error occured while saving user",
        statusCode: 500,
        ok: false,
      });
    }
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: user.email,
      from: "welcome@store.com",
      subject: `Welcome to Store`,
      text: `Hello ${firstName + " " + lastName},\n
Welcome aboard! We're thrilled to have you join us at Store. Get ready to unlock a world of possibilities for your online business. Whether you're here to shop, or explore, we're here to make your ecommerce journey seamless and successful.\n\n
If you have any questions or need assistance, feel free to reach out to our support team. We're here to help you get started and thrive.\n\n
Happy shoping!\n
Best regards,
Store team`,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        return res.status(500).send("Error sending email.");
      }
      res.status(200).send("Password reset email sent.");
    });

    res.status(201).json({
      ok: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
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
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw handleError({
        message: "Email not found",
        statusCode: 404,
        ok: false,
        errorFields: [
          { field: "email", errorMessage: "Please check your credentials" },
        ],
      });
    }
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
      throw handleError({
        message: "password not found",
        statusCode: 404,
        ok: false,
        errorFields: [
          { field: "password", errorMessage: "Please check your credentials" },
        ],
      });
    }
    const isAdmin = user._id.toString() === process.env.ADMIN_ID;
    // initializing jwt token
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
        isAdmin,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30m",
      }
    );
    if (isAdmin)
      res.status(200).json({
        token,
        isAdmin,
        ok: true,
      });
    else {
      const cart = await Cart.findOne({ userId: user._id });
      const wishlist = await Wishlist.findOne({ userId: user._id });
      const cartCount = cart ? cart.items.length : 0;
      const wishlistCount = wishlist ? wishlist.items.length : 0;
      res.status(200).json({
        token,
        ok: true,
        cartCount,
        wishlistCount,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
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
    const { email } = req.body;
    const user = await User.findOne({ email });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: user.email,
      from: "passwordreset@store.com",
      subject: "Password Reset",
      text: `You are receiving this because you have requested the reset of the password for your account.\n\n
      Please click on the following link, or paste this into your browser to complete the process:\n\n
      http://localhost:5173/reset/${token}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        return res.status(500).send("Error sending email.");
      }
      res.status(200).send("Password reset email sent.");
    });

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetForgottenPassword = async (req, res, next) => {
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

    const { password, token } = req.body;
    const verify = jwt.verify(token, process.env.JWT_SECRET);
    if (!verify)
      throw handleError({
        message: "Invalid or expired token.",
        statusCode: 404,
        ok: false,
      });
    const user = await User.findById(verify.id);
    if (!user)
      throw handleError({
        message: "user not found",
        statusCode: 404,
        ok: false,
      });

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    const updatedUser = await user.save();
    if (!updatedUser)
      throw handleError({
        message: "user not saved",
        statusCode: 500,
        ok: false,
      });

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    next(error);
  }
};
