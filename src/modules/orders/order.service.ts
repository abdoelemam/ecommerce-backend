import { NextFunction, Request, Response } from "express";
import orderModel, { OrderStatus } from "../../model/order.model.js";
import cartModel from "../../model/cart.model.js";
import productModel from "../../model/product.model.js";
import couponModel from "../../model/coupon.model.js";
import AppError from "../../utils/AppError.js";
import { AuthRequest } from "../../middleware/auth.js";
import crypto from "crypto";
import userModel, { Roletype } from "../../model/user.model.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { createInvoiceBuffer } from "../../utils/invoicePDF.js";

class OrderService {
    // [1] Create Order from Cart (User)
    async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;
            const { shippingAddress, paymentMethod } = req.body;

            // 1. Get user's cart
            const cart = await cartModel.findOne({ userId });
            if (!cart || cart.items.length === 0) {
                throw new AppError("Cart is empty, add products before ordering", 400);
            }

            // 2. Verify stock for all items
            for (const item of cart.items) {
                const product = await productModel.findById(item.productId);
                if (!product) {
                    throw new AppError(`Product ${item.productId} no longer exists`, 404);
                }
                const variant = product.variants.find(v => v._id?.toString() === item.variantId.toString());
                if (!variant) {
                    throw new AppError(`Variant for product "${product.name}" no longer exists`, 404);
                }
                if (variant.stock < item.quantity) {
                    throw new AppError(
                        `Variant of "${product.name}" only has ${variant.stock} items in stock`,
                        400
                    );
                }
            }

            // 3. Decrement stock for specific variants
            for (const item of cart.items) {
                await productModel.findOneAndUpdate(
                    { _id: item.productId, "variants._id": item.variantId },
                    { $inc: { "variants.$.stock": -item.quantity } }
                );
            }

            // 4. Create order
            const order = await orderModel.create({
                userId,
                items: cart.items,
                totalPrice: cart.totalPrice,
                shippingAddress,
                paymentMethod: paymentMethod || "cash",
                couponId: cart.couponId,
                discount: cart.discount,
                priceAfterDiscount: cart.priceAfterDiscount,
            });

            // 5. Update coupon usage
            if (cart.couponId) {
                await couponModel.findByIdAndUpdate(cart.couponId, {
                    $inc: { usedCount: 1 },
                    $addToSet: { usedBy: userId },
                });
            }

            // 6. Clear cart completely
            cart.items = [];
            cart.totalPrice = 0;
            cart.couponId = undefined;
            cart.discount = 0;
            cart.priceAfterDiscount = 0;
            await cart.save();

            return res.status(201).json({
                message: "Order placed successfully",
                data: { order },
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get My Orders (User)
    async getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            const orders = await orderModel
                .find({ userId })
                .populate("items.productId", "name slug images finalPrice")
                .sort("-createdAt");

            return res.status(200).json({
                message: "Orders fetched successfully",
                data: { orders },
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Get Order by ID (User - own orders only)
    async getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?._id;

            const query: any = { _id: id };
            if (req.user?.role !== Roletype.admin) {
                query.userId = userId;
            }

            const order = await orderModel
                .findOne(query)
                .populate("userId", "username email fname lname name")
                .populate("items.productId", "name slug images finalPrice");

            if (!order) {
                throw new AppError("Order not found", 404);
            }

            return res.status(200).json({
                message: "Order fetched successfully",
                data: { order },
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Cancel Order (User - only if pending)
    async cancelOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?._id;

            const order = await orderModel.findOne({ _id: id, userId });
            if (!order) {
                throw new AppError("Order not found", 404);
            }

            if (order.status !== OrderStatus.pending) {
                throw new AppError(
                    `Cannot cancel order with status "${order.status}". Only pending orders can be cancelled`,
                    400
                );
            }

            // Restore stock to specific variant
            for (const item of order.items) {
                await productModel.findOneAndUpdate(
                    { _id: item.productId, "variants._id": item.variantId },
                    { $inc: { "variants.$.stock": item.quantity } }
                );
            }

            order.status = OrderStatus.cancelled;
            order.cancelledAt = new Date();
            await order.save();

            return res.status(200).json({
                message: "Order cancelled successfully",
                data: { order },
            });
        } catch (error) {
            next(error);
        }
    }

    // ========== Admin Endpoints ==========

    // [5] Get All Orders (Admin)
    async getAllOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, page = "1", limit = "10" } = req.query as Record<string, string>;

            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.max(parseInt(limit), 1);
            const skip = (pageNum - 1) * limitNum;

            const filter: Record<string, any> = {};
            if (status) filter.status = status;

            const [orders, totalCount] = await Promise.all([
                orderModel
                    .find(filter)
                    .populate("userId", "username email fname lname name")
                    .populate("items.productId", "name slug finalPrice")
                    .sort("-createdAt")
                    .skip(skip)
                    .limit(limitNum),
                orderModel.countDocuments(filter),
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);

            return res.status(200).json({
                message: "Orders fetched successfully",
                data: {
                    orders,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        limit: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // [6] Update Order Status (Admin)
    async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const order = await orderModel.findById(id);
            if (!order) {
                throw new AppError("Order not found", 404);
            }

            // Administrative Override: Allow admin to update any order status
            // (Removed restriction for cancelled/delivered to give admin full control)

            // If admin cancels → restore stock to specific variant
            if (status === OrderStatus.cancelled) {
                for (const item of order.items) {
                    await productModel.findOneAndUpdate(
                        { _id: item.productId, "variants._id": item.variantId },
                        { $inc: { "variants.$.stock": item.quantity } }
                    );
                }
                order.cancelledAt = new Date();
            }

            // If delivered → set deliveredAt
            if (status === OrderStatus.delivered) {
                order.deliveredAt = new Date();
                
                // If payment was cash, automatically mark as paid once delivered
                if (order.paymentMethod === "cash" && !order.isPaid) {
                    order.isPaid = true;
                    order.paidAt = new Date();
                    await order.save(); // Save first so we can send the updated invoice
                    
                    try {
                        const populatedOrder = await orderModel.findById(order._id)
                                .populate("userId", "email")
                                .populate("items.productId", "name");
                        if (populatedOrder && (populatedOrder.userId as any).email) {
                            const pdfBuffer = await createInvoiceBuffer(populatedOrder);
                            await sendEmail({
                                to: (populatedOrder.userId as any).email,
                                subject: "Your EcommercePro Order Invoice",
                                html: `<h1>Thank you for your order!</h1><p>Your order <strong>${populatedOrder._id}</strong> has been marked as paid upon delivery. Please find your invoice attached.</p>`,
                                attachments: [{
                                    filename: `invoice_${populatedOrder._id}.pdf`,
                                    content: pdfBuffer,
                                    contentType: "application/pdf"
                                }]
                            });
                        }
                    } catch (err) {
                        console.error("Failed to generate/send PDF:", err);
                    }
                }
            }

            order.status = status;
            await order.save();

            return res.status(200).json({
                message: `Order status updated to "${status}"`,
                data: { order },
            });
        } catch (error) {
            next(error);
        }
    }

    // ========== Paymob Endpoints ==========

    // [7] Create Paymob Checkout Session (User)
    async createPaymobCheckoutSession(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?._id;

            const order = await orderModel.findOne({ _id: id, userId });
            if (!order) throw new AppError("Order not found", 404);
            if (order.isPaid) throw new AppError("Order is already paid", 400);
            if (order.status === OrderStatus.cancelled) throw new AppError("Cannot pay for a cancelled order", 400);

            const user = await userModel.findById(userId);
            if (!user) throw new AppError("User not found", 404);

            // Step 1: Authentication -> get Token
            const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
            });
            if (!authRes.ok) throw new AppError("Failed to authenticate with Paymob", 500);
            const authData = await authRes.json() as any;
            const authToken = authData.token;

            // Step 2: Order Registration -> get Paymob order_id
            const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auth_token: authToken,
                    delivery_needed: "false",
                    amount_cents: Math.round(order.totalPrice * 100).toString(),
                    currency: "EGP",
                    merchant_order_id: order._id.toString() + "_" + Date.now() // Unique constraint bypass in sandbox
                })
            });
            if (!orderRes.ok) throw new AppError("Failed to register order with Paymob", 500);
            const orderData = await orderRes.json() as any;
            const paymobOrderId = orderData.id;

            // Step 3: Payment Key Request
            const pmRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auth_token: authToken,
                    amount_cents: Math.round(order.totalPrice * 100).toString(),
                    expiration: 3600,
                    order_id: paymobOrderId,
                    billing_data: {
                        apartment: "NA", 
                        email: user.email, 
                        floor: "NA", 
                        first_name: user.username, 
                        street: order.shippingAddress.street, 
                        building: "NA", 
                        phone_number: order.shippingAddress.phone, 
                        shipping_method: "NA", 
                        postal_code: "NA", 
                        city: order.shippingAddress.city, 
                        country: "EG", 
                        last_name: user.username, 
                        state: "NA"
                    },
                    currency: "EGP",
                    integration_id: process.env.PAYMOB_INTEGRATION_ID
                })
            });
            if (!pmRes.ok) throw new AppError("Failed to generate Payment Key", 500);
            const pmData = await pmRes.json() as any;
            const paymentToken = pmData.token;

            // Return Iframe URL
            const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

            return res.status(200).json({
                message: "Paymob checkout session created successfully",
                data: { sessionUrl: iframeUrl },
            });
        } catch (error) {
            next(error);
        }
    }

    // [8] Paymob Webhook (Webhook from Paymob Servers)
    async paymobWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const hmacSecret = process.env.PAYMOB_HMAC as string;
            const hmacFromQuery = req.query.hmac as string;
            
            const { obj } = req.body;
            if (!obj) return res.status(200).send("Ignore Webhook (No Object)");

            // The specific array of keys required by Paymob for HMAC concatenation
            const dataToHash = [
                'amount_cents',
                'created_at',
                'currency',
                'error_occured',
                'has_parent_transaction',
                'id',
                'integration_id',
                'is_3d_secure',
                'is_auth',
                'is_capture',
                'is_refunded',
                'is_standalone_payment',
                'is_voided',
                'order.id',
                'owner',
                'pending',
                'source_data.pan',
                'source_data.sub_type',
                'source_data.type',
                'success'
            ];

            // Safely extract nested properties dynamically
            let concatenatedString = "";
            const getValue = (keyPath: string) => {
                const keys = keyPath.split('.');
                let value = obj;
                for (const key of keys) {
                    if (value === undefined || value === null) return "";
                    value = value[key];
                }
                return value !== undefined && value !== null ? value.toString() : "";
            };

            for (const key of dataToHash) {
                concatenatedString += getValue(key);
            }

            // Create our own Hash
            const hashed = crypto.createHmac('sha512', hmacSecret)
                .update(concatenatedString)
                .digest('hex');

            // Compare Hashes
            if (hashed !== hmacFromQuery) {
                console.error("❌ Paymob Webhook HMAC mismatch. Hacking attempt blocked.");
                return res.status(200).json({ message: "Invalid HMAC" }); // Return 200 to prevent Paymob retries regardless
            }

            // Trust Payload. Update our DB if Success!
            if (obj.success === true) {
                // Grab original _id from merchant_order_id (which we set to id_timestamp)
                const merchantOrderId = obj.order.merchant_order_id as string;
                const dbOrderId = merchantOrderId.split("_")[0]; // extract before underscore
                
                const order = await orderModel.findById(dbOrderId);
                if (order && !order.isPaid) {
                    order.isPaid = true;
                    order.paidAt = new Date();
                    await order.save();
                    console.log(`✅ Paymob Webhook: Order ${dbOrderId} marked as Paid!`);
                    
                    try {
                        const populatedOrder = await orderModel.findById(order._id)
                                .populate("userId", "email")
                                .populate("items.productId", "name");
                        if (populatedOrder && (populatedOrder.userId as any).email) {
                            const pdfBuffer = await createInvoiceBuffer(populatedOrder);
                            await sendEmail({
                                to: (populatedOrder.userId as any).email,
                                subject: "Your EcommercePro Order Invoice",
                                html: `<h1>Thank you for your order!</h1><p>Your order <strong>${populatedOrder._id}</strong> has been successfully paid online. Please find your invoice attached.</p>`,
                                attachments: [{
                                    filename: `invoice_${populatedOrder._id}.pdf`,
                                    content: pdfBuffer,
                                    contentType: "application/pdf"
                                }]
                            });
                        }
                    } catch (err) {
                        console.error("Failed to generate/send PDF via webhook:", err);
                    }
                }
            } else {
                console.log("❌ Paymob Webhook: Payment transaction failed or declined.");
            }

            return res.status(200).json({ message: "Webhook processed" });
        } catch (error) {
           console.error("Paymob Webhook Error:", error);
           return res.status(200).json({ message: "Error" });
        }
    }
}

export default new OrderService();
