const express = require('express');
const { body } = require('express-validator');
const {
  createBatch, getAllBatches, getBatchById, updateBatch,
  assignUserToBatch, removeUserFromBatch, deleteBatch,
} = require('../controllers/batch.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect, authorize('admin'));

const scheduleValidator = body('schedule')
  .isArray({ min: 1 }).withMessage('Schedule must be a non-empty array')
  .custom((schedule) => {
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const s of schedule) {
      if (!validDays.includes(s.day)) throw new Error(`Invalid day: ${s.day}`);
      if (!timeRegex.test(s.startTime)) throw new Error('startTime must be HH:MM');
      if (!timeRegex.test(s.endTime)) throw new Error('endTime must be HH:MM');
    }
    return true;
  });

router
  .route('/')
  .get(getAllBatches)
  .post(
    [
      body('name').trim().notEmpty().withMessage('Batch name is required').isLength({ min: 2 }),
      body('description').optional().trim(),
      scheduleValidator,
    ],
    validate,
    createBatch
  );

router
  .route('/:id')
  .get(getBatchById)
  .put(
    [
      body('name').optional().trim().isLength({ min: 2 }),
      body('schedule').optional(),
    ],
    validate,
    updateBatch
  )
  .delete(deleteBatch);

router.post(
  '/:id/assign',
  [body('userId').isMongoId().withMessage('Valid userId is required')],
  validate,
  assignUserToBatch
);

router.delete('/:id/remove/:userId', removeUserFromBatch);

module.exports = router;
