import { OrderStatus, PaymentStatus } from '@generated/prisma/enums';

export type IOrderFilterRequest = {
  search?: string | undefined;
  // Client-facing label (e.g. 'Preparing'), mapped through orders.utils#toDbOrderStatus
  status?: string | undefined;
};

export interface CreateOrderItemInput {
  menuItemId?: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  selectedVariant?: Record<string, unknown>;
  selectedAddOns?: unknown[];
  lineTotal: number;
}

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  email?: string;
  fulfillmentType: 'delivery' | 'pickup';
  items: CreateOrderItemInput[];
  address?: string;
  notes?: string;
  paymentMethod: string;
  couponCode?: string;
  userId?: string;
  senderPhone?: string;
  providerTransactionId?: string;
}

export interface OrderItemRecord {
  id?: string;
  orderId?: string;
  menuItemId?: string | null;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selectedVariant: unknown;
  selectedAddOns: unknown;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  fulfillmentType: string;
  itemSummary: string;
  address: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  vat: number;
  serviceCharge: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: Date;
  items?: OrderItemRecord[];
}
