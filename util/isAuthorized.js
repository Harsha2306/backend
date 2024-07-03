const jwt = require("jsonwebtoken");
require("dotenv").config();

const { handleError } = require("./handleError");

exports.isAuthorized = (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      throw handleError({
        message: "Not Authorized",
        statusCode: 401,
        ok: false,
      });
    }
    const token = req.get("Authorization").split(" ")[1];
    if (!token) {
      throw handleError({
        message: "Token missing in authorization header",
        statusCode: 401,
        ok: false,
      });
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      throw handleError({
        message: "Not Authorized",
        statusCode: 401,
        ok: false,
      });
    }
    req.userId = decodedToken.userId;
    req.isAdmin = decodedToken.isAdmin;
  } catch (error) {
    next(error);
  }
  next();
};

exports.isAuthorizedFlag = (req) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) return false;
    const token = authHeader.split(" ")[1];
    if (!token) return false;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) return false;
    req.userId = decodedToken.userId;
    return true;
  } catch (error) {
    return false;
  }
};
