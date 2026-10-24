import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import { checkAuth } from '@/middlewares/checkAuth';
import validateRequest from '@/middlewares/validateRequest';

import { ReviewController } from './reviews.controller';
import { ReviewValidation } from './reviews.validation';

const router = Router();

// Public: view approved reviews for a specific menu item
router.get('/menu/:menuItemId', ReviewController.getReviewsByMenuItem);

// Customer: submit a review
router.post(
  '/',
  checkAuth(),
  validateRequest(ReviewValidation.createReview),
  ReviewController.createReview,
);

// GET /reviews - Public when querying approved reviews; staff auth required for full moderation list
router.get(
  '/',
  (req, res, next) => {
    if (req.query.isApproved === 'true') {
      return next();
    }
    return checkAuth(
      UserRole.CASHIER,
      UserRole.MANAGER,
      UserRole.OWNER,
      UserRole.SUPER_ADMIN,
    )(req, res, next);
  },
  validateRequest(ReviewValidation.getReviews),
  ReviewController.getAllReviews,
);

router.patch(
  '/:id/status',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateRequest(ReviewValidation.updateReviewStatus),
  ReviewController.updateReviewStatus,
);

router.delete(
  '/:id',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  ReviewController.deleteReview,
);

export const ReviewRoutes = router;
