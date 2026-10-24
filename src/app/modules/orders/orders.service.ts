import {
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@generated/prisma/enums';
import type { OrderItemUncheckedCreateWithoutOrderInput } from '@generated/prisma/models/OrderItem';

import { prisma } from '@/config/prisma.config';
import AppError from '@/helpers/AppError';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { calculatePagination } from '@/utils/paginationHelper';
import { EmailService } from '@/utils/sendEmail';
import { emitEvent } from '@/utils/socket';
import StatusCode from '@/utils/statusCode';

import { CreateOrderPayload } from './orders.interface';
import {
  fromDbOrderStatus,
  toClientOrder as toClient,
  toDbOrderStatus,
  VALID_ORDER_TRANSITIONS as VALID_TRANSITIONS,
} from './orders.utils';

const getOrders = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = calculatePagination({
    page: Number(query.page || 1),
    limit: Number(query.limit || query.pageSize || 10),
  });
  const search = typeof query.search === 'string' ? query.search : undefined;
  const status =
    typeof query.status === 'string' && query.status ? toDbOrderStatus(query.status) : undefined;

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { id: { contains: search, mode: 'insensitive' as const } },
        {
          customerName: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          itemSummary: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  return { data: data.map(toClient), total, page, limit };
};

const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new AppError(StatusCode.NOT_FOUND, 'Order not found');
  return toClient(order);
};

const createOrder = async (payload: CreateOrderPayload) => {
  const settings = await prisma.restaurantSettings.findFirst({
    where: { id: 'default' },
  });
  const vatRate = settings ? settings.vatRate / 100 : 0.05;
  const serviceChargeRate = settings ? settings.serviceChargeRate / 100 : 0.1;

  const jsonInput = (value: unknown) =>
    value as OrderItemUncheckedCreateWithoutOrderInput['selectedVariant'];

  // Validate and price each item from the DB — client prices are never trusted.
  const items: OrderItemUncheckedCreateWithoutOrderInput[] = await Promise.all(
    payload.items.map(async (item) => {
      if (!item.menuItemId) {
        // Custom items without a menuItemId fall back to the client price.
        return {
          menuItemId: null,
          nameSnapshot: item.nameSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          selectedVariant: jsonInput(item.selectedVariant ?? undefined),
          selectedAddOns: jsonInput(item.selectedAddOns ?? undefined),
          lineTotal: item.unitPrice * item.quantity,
        };
      }

      const dbItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });
      if (!dbItem || !dbItem.isAvailable) {
        throw new AppError(StatusCode.BAD_REQUEST, `Item "${item.nameSnapshot}" is not available.`);
      }

      const unitPrice = dbItem.price;
      const lineTotal = unitPrice * item.quantity;
      return {
        menuItemId: item.menuItemId,
        nameSnapshot: dbItem.name,
        quantity: item.quantity,
        unitPrice,
        selectedVariant: jsonInput(item.selectedVariant ?? undefined),
        selectedAddOns: jsonInput(item.selectedAddOns ?? undefined),
        lineTotal,
      };
    }),
  );

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  // Validate and apply the coupon, if one was supplied.
  let discount = 0;
  if (payload.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: payload.couponCode, isActive: true },
    });
    if (coupon) {
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new AppError(StatusCode.BAD_REQUEST, 'This coupon has expired.');
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new AppError(StatusCode.BAD_REQUEST, 'Coupon usage limit reached.');
      }
      if (subtotal < coupon.minOrderValue) {
        throw new AppError(
          StatusCode.BAD_REQUEST,
          `Minimum order for this coupon is ৳${coupon.minOrderValue}.`,
        );
      }
      discount =
        coupon.discountType === 'percent'
          ? subtotal * (coupon.discountValue / 100)
          : coupon.discountValue;
      discount = Math.min(discount, subtotal);
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }
  }

  let deliveryFee = 0;
  if (payload.fulfillmentType === 'delivery') {
    const fee = settings?.deliveryFee ?? 80;
    const freeMin = settings?.freeDeliveryMin ?? 0;
    const isFree = freeMin > 0 && subtotal >= freeMin;
    deliveryFee = isFree ? 0 : fee;
  }

  const taxable = subtotal - discount;
  const vat = taxable * vatRate;
  const serviceCharge = taxable * serviceChargeRate;
  const total = taxable + vat + serviceCharge + deliveryFee;

  const itemSummary = items.map((i) => `${i.nameSnapshot} x${i.quantity}`).join(', ');

  const order = await prisma.order.create({
    data: {
      customerName: payload.customerName,
      phone: payload.phone,
      email: payload.email,
      fulfillmentType: payload.fulfillmentType.toUpperCase() as FulfillmentType,
      itemSummary,
      address: payload.address,
      notes: payload.notes,
      subtotal,
      deliveryFee,
      vat,
      serviceCharge,
      discount,
      total,
      paymentMethod: payload.paymentMethod.toUpperCase() as PaymentMethod,
      userId: payload.userId ?? null,
      items: { create: items },
    },
    include: { items: true },
  });

  // For mobile banking (bKash / Nagad), create linked Payment record for cashier reconciliation
  if (['BKASH', 'NAGAD'].includes(order.paymentMethod)) {
    const provider = order.paymentMethod as unknown as PaymentProvider;
    await prisma.payment
      .create({
        data: {
          orderId: order.id,
          amount: order.total,
          provider,
          method: order.paymentMethod,
          providerTransactionId: payload.providerTransactionId || undefined,
          status: PaymentStatus.PENDING,
          verificationPayload: payload.senderPhone
            ? { senderPhone: payload.senderPhone }
            : undefined,
        },
      })
      .catch((err) => console.error('[Payment] Creation failed:', err));
  }

  // Send order confirmation email
  if (order.email) {
    EmailService.sendOrderConfirmation({
      customerName: order.customerName,
      email: order.email,
      id: order.id,
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
      total: order.total,
      fulfillmentType: order.fulfillmentType,
      paymentMethod: order.paymentMethod,
    }).catch((err) => console.error('[Email] Order confirmation failed:', err));
  }

  const clientOrder = toClient(order);
  emitEvent('order:new', clientOrder);
  return clientOrder;
};

const updateOrderStatus = async (id: string, statusInput: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new AppError(StatusCode.NOT_FOUND, 'Order not found');

  const targetDbStatus = toDbOrderStatus(statusInput);
  const targetPascalStatus = fromDbOrderStatus(targetDbStatus);

  const currentPascalStatus = fromDbOrderStatus(order.status);
  const allowed = VALID_TRANSITIONS[currentPascalStatus] ?? [];
  if (!allowed.includes(targetPascalStatus) && currentPascalStatus !== targetPascalStatus) {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      `Cannot transition from "${currentPascalStatus}" to "${targetPascalStatus}".`,
    );
  }

  const updateData: Record<string, unknown> = {
    status: targetDbStatus,
  };

  // Trigger inventory deduction when order is Accepted, Preparing, or Delivered (idempotent)
  const INVENTORY_DEDUCT_STATUSES: OrderStatus[] = [
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.DELIVERED,
  ];
  if (INVENTORY_DEDUCT_STATUSES.includes(targetDbStatus)) {
    const alreadyDeducted = await prisma.inventoryAudit.findFirst({
      where: { reason: { contains: `[Order #${id}]` } },
    });

    if (!alreadyDeducted) {
      const orderItems = (order.items ?? []).map((item) => ({
        nameSnapshot: item.nameSnapshot,
        quantity: item.quantity,
      }));
      await InventoryService.adjustStockForOrder(orderItems, id);
    }
  }

  // When transitioning to "Delivered", mark COD payment as completed
  if (targetDbStatus === OrderStatus.DELIVERED) {
    await prisma.payment.updateMany({
      where: {
        orderId: id,
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
      },
      data: { status: PaymentStatus.COMPLETED },
    });

    // Update order's payment status to completed
    updateData.paymentStatus = PaymentStatus.COMPLETED;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  // Send status update email for key statuses
  const NOTIFY_STATUSES = ['Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'];
  if (NOTIFY_STATUSES.includes(targetPascalStatus) && updated.email) {
    EmailService.sendOrderStatusUpdate({
      customerName: updated.customerName,
      email: updated.email,
      id: updated.id,
      status: targetPascalStatus,
    }).catch((err) => console.error('[Email] Status update failed:', err));
  }

  const clientUpdated = toClient(updated);
  emitEvent('order:status_updated', clientUpdated);
  return clientUpdated;
};

const getOrdersByUser = async (userId: string, query: Record<string, unknown>) => {
  const { page, limit, skip } = calculatePagination({
    page: Number(query.page || 1),
    limit: Number(query.limit || query.pageSize || 5),
  });

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { items: true },
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return { data: data.map(toClient), total, page, limit };
};

export const OrdersService = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getOrdersByUser,
};
