const { verifyToken } = require('../utils/jwt.utils');
const User = require('../models/user.model');
const { errorResponse } = require('../utils/response.utils');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Access denied. No token provided.');
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return errorResponse(res, 401, 'Token is invalid. User not found.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Invalid token.');
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token has expired.');
    }
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `Role '${req.user.role}' is not authorized to access this resource.`);
    }
    next();
  };
};

module.exports = { protect, authorize };
