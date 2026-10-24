import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import { checkAuth } from '@/middlewares/checkAuth';
import validateRequest from '@/middlewares/validateRequest';

import { NotificationsController } from './notifications.controller';
import { NotificationsValidation } from './notifications.validation';

const router = Router();

// Protected — authenticated staff can read and mark notifications
router.get('/', checkAuth(), NotificationsController.getNotifications);
router.patch('/read-all', checkAuth(), NotificationsController.markAllRead);
router.patch('/:id/read', checkAuth(), NotificationsController.markRead);

// Protected — manager+ can create notifications (system events)
router.post(
  '/',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateRequest(NotificationsValidation.createNotification),
  NotificationsController.createNotification,
);

export const NotificationsRoutes = router;
