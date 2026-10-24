import { UserRole } from '@generated/prisma/enums';
import { Router } from 'express';

import { checkAuth, optionalAuth } from '@/middlewares/checkAuth';
import validateRequest from '@/middlewares/validateRequest';

import { OrdersController } from './orders.controller';
import { OrdersValidation } from './orders.validation';

const router = Router();

// Public — customers place orders (optionalAuth links order to account if logged in)
router.post(
  '/',
  optionalAuth,
  validateRequest(OrdersValidation.createOrder),
  OrdersController.createOrder,
);

router.post(
  '/create',
  optionalAuth,
  validateRequest(OrdersValidation.createOrder),
  OrdersController.createOrder,
);

// Protected — authenticated customer views their own orders
router.get('/my', checkAuth(), OrdersController.getMyOrders);

// Public — order tracking by ID (customer looks up their own order)
router.get('/:id', OrdersController.getOrderById);

// Protected — cashier+ views all orders
router.get(
  '/',
  checkAuth(
    UserRole.CASHIER,
    UserRole.KITCHEN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
  ),
  OrdersController.getOrders,
);

// Protected — cashier+ updates order status
router.patch(
  '/:id',
  checkAuth(
    UserRole.CASHIER,
    UserRole.KITCHEN,
    UserRole.MANAGER,
    UserRole.OWNER,
    UserRole.SUPER_ADMIN,
  ),
  validateRequest(OrdersValidation.updateOrderStatus),
  OrdersController.updateOrderStatus,
);

export const OrdersRoutes = router;
