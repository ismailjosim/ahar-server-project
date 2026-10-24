import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import { checkAuth } from '@/middlewares/checkAuth';

import { ReportsController } from './reports.controller';

const router = Router();

// Protected — manager+ can fetch summary stats with date range
router.get(
  '/summary',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  ReportsController.getSummaryStats,
);

// Protected — manager+ can export reports
router.get(
  '/export',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  ReportsController.exportCsv,
);

// Protected — manager+ can fetch dashboard stats
router.get(
  '/stats',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  ReportsController.getDashboardStats,
);

export const ReportsRoutes = router;
