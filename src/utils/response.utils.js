const successResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode, message, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { successResponse, errorResponse };
