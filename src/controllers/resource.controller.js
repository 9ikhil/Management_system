const path = require('path');
const fs = require('fs');
const Resource = require('../models/resource.model');
const Batch = require('../models/batch.model');
const { successResponse, errorResponse } = require('../utils/response.utils');

// @desc   Admin: Upload resource (PDF or link)
// @route  POST /api/resources
// @access Admin
const createResource = async (req, res, next) => {
  try {
    const { title, description, type, url, batch } = req.body;

    const batchDoc = await Batch.findById(batch);
    if (!batchDoc) return errorResponse(res, 404, 'Batch not found.');

    const resourceData = { title, description, type, batch, uploadedBy: req.user._id };

    if (type === 'link') {
      if (!url) return errorResponse(res, 400, 'URL is required for link resources.');
      resourceData.url = url;
    } else if (type === 'pdf') {
      if (!req.file) return errorResponse(res, 400, 'PDF file is required.');
      resourceData.filePath = req.file.path;
      resourceData.fileName = req.file.originalname;
      resourceData.fileSize = req.file.size;
      resourceData.url = `/uploads/resources/${req.file.filename}`;
    }

    const resource = await Resource.create(resourceData);
    const populated = await Resource.findById(resource._id)
      .populate('batch', 'name')
      .populate('uploadedBy', 'name email');

    return successResponse(res, 201, 'Resource created successfully.', { resource: populated });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Get all resources
// @route  GET /api/resources
// @access Admin
const getAllResources = async (req, res, next) => {
  try {
    const { batch, type, page = 1, limit = 10, search } = req.query;
    const query = { isActive: true };

    if (batch) query.batch = batch;
    if (type) query.type = type;
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('batch', 'name')
        .populate('uploadedBy', 'name email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Resource.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Resources fetched.', { resources }, {
      total, page: Number(page), pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   User: Get resources for their batch
// @route  GET /api/resources/my-batch
// @access User
const getMyBatchResources = async (req, res, next) => {
  try {
    if (!req.user.assignedBatch) {
      return errorResponse(res, 400, 'You are not assigned to any batch.');
    }

    const { type, page = 1, limit = 10 } = req.query;
    const query = { batch: req.user.assignedBatch, isActive: true };
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('uploadedBy', 'name')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Resource.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Resources fetched.', { resources }, {
      total, page: Number(page), pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single resource
// @route  GET /api/resources/:id
// @access Private
const getResourceById = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('batch', 'name')
      .populate('uploadedBy', 'name email');

    if (!resource || !resource.isActive) return errorResponse(res, 404, 'Resource not found.');

    // Users can only access resources from their batch
    if (req.user.role === 'user') {
      if (String(resource.batch._id) !== String(req.user.assignedBatch)) {
        return errorResponse(res, 403, 'Access denied. Resource is not from your batch.');
      }
    }

    return successResponse(res, 200, 'Resource fetched.', { resource });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Update resource
// @route  PUT /api/resources/:id
// @access Admin
const updateResource = async (req, res, next) => {
  try {
    const { title, description, url, isActive } = req.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) return errorResponse(res, 404, 'Resource not found.');

    const updated = await Resource.findByIdAndUpdate(
      req.params.id,
      { title, description, url, isActive },
      { new: true, runValidators: true }
    ).populate('batch', 'name').populate('uploadedBy', 'name email');

    return successResponse(res, 200, 'Resource updated.', { resource: updated });
  } catch (error) {
    next(error);
  }
};

// @desc   Admin: Delete resource
// @route  DELETE /api/resources/:id
// @access Admin
const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return errorResponse(res, 404, 'Resource not found.');

    // Delete physical file if PDF
    if (resource.filePath && fs.existsSync(resource.filePath)) {
      fs.unlinkSync(resource.filePath);
    }

    await resource.deleteOne();
    return successResponse(res, 200, 'Resource deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createResource, getAllResources, getMyBatchResources,
  getResourceById, updateResource, deleteResource,
};
