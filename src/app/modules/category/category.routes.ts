import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import { fileUploader } from '@/config/multer.config';
import { checkAuth } from '@/middlewares/checkAuth';
import validateRequest from '@/middlewares/validateRequest';

import { CategoryController } from './category.controller';
import { CategoryValidation } from './category.validation';

const router = Router();

// Public — anyone can browse categories
router.get('/', CategoryController.getCategories);
router.get('/:id', CategoryController.getCategoryById);

// Protected — manager+ can create and edit categories
router.post(
  '/create',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  fileUploader.multerUpload.single('file'),
  validateRequest(CategoryValidation.createCategory),
  CategoryController.createCategory,
);

router.patch(
  '/:id',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  fileUploader.multerUpload.single('file'),
  validateRequest(CategoryValidation.updateCategory),
  CategoryController.updateCategory,
);

// Protected — owner/super_admin only can delete categories
router.delete(
  '/:id',
  checkAuth(UserRole.OWNER, UserRole.SUPER_ADMIN),
  CategoryController.deleteCategory,
);

// Protected test utility
router.get(
  '/insert/dummy',
  checkAuth(UserRole.SUPER_ADMIN),
  CategoryController.injectDummyCategories,
);

export const CategoryRoutes = router;
