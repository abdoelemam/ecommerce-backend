import { z } from "zod";
import { PaymentMethod, OrderStatus } from "../../model/order.model.js";

export const createOrderSchema = {
    body: z.object({
        shippingAddress: z.object({
            street: z.string().min(3, "Street is required"),
            city: z.string().min(2, "City is required"),
            phone: z.string().min(10, "Phone must be at least 10 digits"),
        }),
        paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    }),
};

export const updateOrderStatusSchema = {
    body: z.object({
        status: z.nativeEnum(OrderStatus),
    }),
    params: z.object({
        id: z.string().length(24, "Invalid Order ID"),
    }),
};

export const orderParamsSchema = {
    params: z.object({
        id: z.string().length(24, "Invalid Order ID"),
    }),
};
