import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { createOrderSchema, updateOrderStatusSchema, orderParamsSchema } from "./order.validation.js";
import orderService from "./order.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";

const orderRouter = Router();

// Webhook must be outside of `auth` protection, because it's called by Paymob Servers directly
orderRouter.post("/webhook/paymob", orderService.paymobWebhook);
orderRouter.get("/webhook/paymob", orderService.paymobRedirect);

// All order routes require authentication
orderRouter.use(auth);

// ========== User Routes ==========

// POST /orders - Create order from cart
orderRouter.post("/", validate(createOrderSchema), orderService.createOrder);

// GET /orders/my-orders - Get my orders
orderRouter.get("/my-orders", orderService.getMyOrders);

// GET /orders/:id - Get single order
orderRouter.get("/:id", validate(orderParamsSchema), orderService.getOrderById);

// POST /orders/:id/checkout-session - Create Paymob Session
orderRouter.post("/:id/checkout-session", validate(orderParamsSchema), orderService.createPaymobCheckoutSession);

// PATCH /orders/:id/cancel - Cancel order
orderRouter.patch("/:id/cancel", validate(orderParamsSchema), orderService.cancelOrder);

// ========== Admin Routes ==========

// GET /orders - Get all orders (Admin)
orderRouter.get("/", authorize(Roletype.admin), orderService.getAllOrders);

// PATCH /orders/:id/status - Update order status (Admin)
orderRouter.patch(
    "/:id/status",
    authorize(Roletype.admin),
    validate(updateOrderStatusSchema),
    orderService.updateOrderStatus
);

export default orderRouter;
