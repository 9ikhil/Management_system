const express = require('express');
const { body } = require('express-validator');
const {
  createUser, getAllUsers, getUserById, updateUser, deleteUser,
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, authorize('admin'));

router
  .route('/')
  .get(getAllUsers)
  .post(
    [
      body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }),
      body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
      body('assignedBatch').optional().isMongoId().withMessage('Invalid batch ID'),
    ],
    validate,
    createUser
  );

router
  .route('/:id')
  .get(getUserById)
  .put(
    [
      body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
      body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
      body('assignedBatch').optional({ nullable: true }).isMongoId().withMessage('Invalid batch ID'),
    ],
    validate,
    updateUser
  )
  .delete(deleteUser);

module.exports = router;
