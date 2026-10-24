import { z } from 'zod';

const BD_PHONE_REGEX = /^(?:\+?880|0)?1[3-9]\d{8}$/;

const orderItemBody = z.object({
  menuItemId: z.string().optional(),

  nameSnapshot: z.string().trim().optional(),

  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than 0'),

  unitPrice: z.number().positive('Unit price must be greater than 0'),

  selectedVariant: z.record(z.string(), z.unknown()).optional(),

  selectedAddOns: z.array(z.unknown()).optional(),

  lineTotal: z.number().positive('Line total must be greater than 0').optional(),
});

const createOrder = z.object({
  body: z.object({
    // Customer
    customerName: z.string().trim().min(1, 'Customer name is required').max(120),

    phone: z.string().trim().regex(BD_PHONE_REGEX, 'Invalid BD phone number'),

    email: z.preprocess(
      (val) => (typeof val === 'string' && !val.trim() ? undefined : val),
      z.string().trim().email('Invalid email address').optional(),
    ),

    // Fulfillment
    fulfillmentType: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
      z.enum(['DELIVERY', 'PICKUP']),
    ),

    // Items
    items: z.array(orderItemBody).min(1, 'Order must have at least one item'),

    // Delivery
    address: z.preprocess(
      (val) => (typeof val === 'string' && !val.trim() ? undefined : val),
      z.string().trim().min(5, 'Address must be at least 5 characters').optional(),
    ),

    notes: z.preprocess(
      (val) => (typeof val === 'string' && !val.trim() ? undefined : val),
      z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
    ),

    // Payment
    paymentMethod: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
      z.enum(['COD', 'SSLCOMMERZ', 'BKASH', 'NAGAD', 'CARD']),
    ),

    // Mobile banking / provider transaction details
    senderPhone: z.preprocess(
      (val) => (typeof val === 'string' && !val.trim() ? undefined : val),
      z.string().trim().regex(BD_PHONE_REGEX, 'Invalid sender BD phone number').optional(),
    ),
    providerTransactionId: z.preprocess(
      (val) => (typeof val === 'string' && !val.trim() ? undefined : val),
      z.string().trim().min(3, 'Transaction ID must be at least 3 characters').max(100).optional(),
    ),

    // Coupon
    couponCode: z.preprocess(
      (val) => (typeof val === 'string' && !val.trim() ? undefined : val),
      z.string().trim().optional(),
    ),
  }),
});

const updateOrderStatus = z.object({
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),

  body: z.object({
    status: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          return val
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_');
        }
        return val;
      },
      z.enum([
        'PLACED',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ]),
    ),
  }),
});

export const OrdersValidation = {
  createOrder,
  updateOrderStatus,
};
