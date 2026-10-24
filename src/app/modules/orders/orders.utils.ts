import { OrderStatus, PaymentStatus } from '@generated/prisma/enums';

import { OrderItemRecord, OrderRecord } from './orders.interface';

export const normalizeOrderStatus = (status?: string): OrderStatus => {
  if (!status) return OrderStatus.PLACED;
  const clean = status
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  switch (clean) {
    case 'ACCEPTED':
      return OrderStatus.ACCEPTED;
    case 'PREPARING':
      return OrderStatus.PREPARING;
    case 'READY':
      return OrderStatus.READY;
    case 'OUT_FOR_DELIVERY':
      return OrderStatus.OUT_FOR_DELIVERY;
    case 'DELIVERED':
      return OrderStatus.DELIVERED;
    case 'CANCELLED':
      return OrderStatus.CANCELLED;
    case 'PLACED':
    default:
      return OrderStatus.PLACED;
  }
};

export const toDbOrderStatus = (status?: string): OrderStatus => {
  return normalizeOrderStatus(status);
};

export const fromDbOrderStatus = (status?: OrderStatus | string): string => {
  const norm = normalizeOrderStatus(typeof status === 'string' ? status : undefined);
  // If status is a direct OrderStatus enum instance
  const effectiveStatus = Object.values(OrderStatus).includes(status as OrderStatus)
    ? (status as OrderStatus)
    : norm;

  switch (effectiveStatus) {
    case OrderStatus.ACCEPTED:
      return 'Accepted';
    case OrderStatus.PREPARING:
      return 'Preparing';
    case OrderStatus.READY:
      return 'Ready';
    case OrderStatus.OUT_FOR_DELIVERY:
      return 'Out for Delivery';
    case OrderStatus.DELIVERED:
      return 'Delivered';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    case OrderStatus.PLACED:
    default:
      return 'Placed';
  }
};

export const toDbPaymentStatus = (status?: string) => {
  switch (status) {
    case 'Completed':
      return PaymentStatus.COMPLETED;
    case 'Failed':
      return PaymentStatus.FAILED;
    case 'Refunded':
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.PENDING;
  }
};

export const fromDbPaymentStatus = (status: PaymentStatus) => {
  switch (status) {
    case PaymentStatus.COMPLETED:
      return 'Completed';
    case PaymentStatus.FAILED:
      return 'Failed';
    case PaymentStatus.REFUNDED:
      return 'Refunded';
    default:
      return 'Pending';
  }
};

export const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  Placed: ['Accepted', 'Cancelled'],
  Accepted: ['Preparing', 'Cancelled'],
  Preparing: ['Ready'],
  Ready: ['Out for Delivery', 'Delivered'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export const toClientOrder = (order?: OrderRecord | null) => {
  if (!order) return null;
  return {
    id: order.id,
    customer: order.customerName,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    fulfillmentType: order.fulfillmentType,
    itemSummary: order.itemSummary,
    items: (order.items ?? []).map((item: OrderItemRecord) => ({
      id: item.id,
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      nameSnapshot: item.nameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      notes: null,
      menuItem: {
        id: item.menuItemId || '',
        name: item.nameSnapshot,
        price: item.unitPrice,
      },
    })),
    // lineItems carries the structured breakdown for the tracking page
    lineItems: (order.items ?? []).map((item: OrderItemRecord) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      variant: item.selectedVariant ?? null,
      addOns: item.selectedAddOns ?? null,
    })),
    address: order.address,
    notes: order.notes,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    vat: order.vat,
    serviceCharge: order.serviceCharge,
    discount: order.discount,
    total: order.total,
    method: order.paymentMethod,
    paymentMethod: order.paymentMethod,
    paymentStatus: fromDbPaymentStatus(order.paymentStatus),
    status: fromDbOrderStatus(order.status),
    type: capitalize(order.fulfillmentType),
    createdAt: order.createdAt,
  };
};
