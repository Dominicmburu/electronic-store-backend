import { Product } from '@prisma/client';

export interface CartItemWithProduct {
  productId: number;
  quantity: number;
  product: Product;
}

export interface PlaceOrderRequestBody {
  shippingAddress: string;
  paymentMethod: string;
}

export interface UpdateOrderStatusRequestBody {
  status: string;
}
