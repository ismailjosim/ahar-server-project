import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import { fileUploader } from '@/config/multer.config';
import { checkAuth } from '@/middlewares/checkAuth';
import validateRequest from '@/middlewares/validateRequest';

import { MenuController } from './menu.controller';
import { MenuItemValidation } from './menu.validation';

const router = Router();

// Public Routes
router.get('/', MenuController.getMenuItems);
router.get('/:id', MenuController.getMenuItemById);

// Protected Routes — Manager / Owner / Super Admin
router.post(
  '/create',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  fileUploader.multerUpload.single('file'),
  validateRequest(MenuItemValidation.createMenuItem),
  MenuController.createMenuItem,
);

router.patch(
  '/:id',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  fileUploader.multerUpload.single('file'),
  validateRequest(MenuItemValidation.updateMenuItem),
  MenuController.updateMenuItem,
);

router.delete(
  '/:id',
  checkAuth(UserRole.OWNER, UserRole.SUPER_ADMIN),
  MenuController.deleteMenuItem,
);

export const MenuRoutes = router;
