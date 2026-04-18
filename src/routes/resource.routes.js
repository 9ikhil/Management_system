const express = require('express');
const { body } = require('express-validator');
const {
  createResource, getAllResources, getMyBatchResources,
  getResourceById, updateResource, deleteResource,
} = require('../controllers/resource.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

// User: Get resources for their own batch
router.get('/my-batch', authorize('user'), getMyBatchResources);

// Admin only routes
router
  .route('/')
  .get(authorize('admin'), getAllResources)
  .post(
    authorize('admin'),
    upload.single('file'),
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('type').isIn(['pdf', 'link', 'video', 'document']).withMessage('Invalid resource type'),
      body('batch').isMongoId().withMessage('Valid batch ID is required'),
      body('url').optional().isURL().withMessage('Must be a valid URL'),
    ],
    validate,
    createResource
  );

router
  .route('/:id')
  .get(getResourceById)
  .put(authorize('admin'), updateResource)
  .delete(authorize('admin'), deleteResource);

module.exports = router;
