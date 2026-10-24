import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import checkAuth from '@/middlewares/checkAuth';
import validateRequest from '@/middlewares/validateRequest';

import { PaymentsController } from './payments.controller';
import { PaymentsValidation } from './payments.validation';

const router = Router();

// cashier+ can read all payments
router.get(
  '/',
  checkAuth(UserRole.CASHIER, UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  PaymentsController.getPayments,
);
router.get(
  '/:id',
  checkAuth(UserRole.CASHIER, UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  PaymentsController.getPaymentById,
);

// cashier+ can create payment records (triggered by order flow)
router.post(
  '/',
  checkAuth(UserRole.CASHIER, UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateRequest(PaymentsValidation.createPayment),
  PaymentsController.createPayment,
);

// owner+ can update payment status (refunds, manual corrections)
router.patch(
  '/:id',
  checkAuth(UserRole.MANAGER, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validateRequest(PaymentsValidation.updatePayment),
  PaymentsController.updatePayment,
);

// Authenticated user initiates payment
router.post('/sslcommerz/init', checkAuth(), PaymentsController.initSSLCommerz);

// SSLCOMMERZ callbacks (POST from gateway browser redirection or direct HTTP)
router.post('/sslcommerz/success', PaymentsController.sslcommerzSuccess);
router.get('/sslcommerz/success', PaymentsController.sslcommerzSuccess);

router.post('/sslcommerz/fail', PaymentsController.sslcommerzFail);
router.get('/sslcommerz/fail', PaymentsController.sslcommerzFail);

router.post('/sslcommerz/cancel', PaymentsController.sslcommerzCancel);
router.get('/sslcommerz/cancel', PaymentsController.sslcommerzCancel);

// IPN from SSLCOMMERZ (server-to-server webhook)
router.post('/sslcommerz/ipn', PaymentsController.handleSSLCommerzIPN);

export const PaymentsRoutes = router;
