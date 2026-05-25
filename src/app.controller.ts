
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "dotenv"
import path from "path";
import connectDB from "./DB/connectionDB.js";
import userRouter from "./modules/users/user.controller.js";
import categoryRouter from "./modules/categories/category.controller.js";
import brandRouter from "./modules/brands/brand.controller.js";
import productRouter from "./modules/products/product.controller.js";
import cartRouter from "./modules/cart/cart.controller.js";
import orderRouter from "./modules/orders/order.controller.js";
import wishlistRouter from "./modules/wishlist/wishlist.controller.js";
import couponRouter from "./modules/coupons/coupon.controller.js";
import reviewRouter from "./modules/reviews/review.controller.js";
import AppError from "./utils/AppError.js";

config({ path: path.resolve("./config/.env") });

const app: express.Application = express();
const port: string | number = process.env.PORT || 5000;

const bootstrap = async () => {
    app.use(express.json());
    app.use(cors());
    // app.use(helmet());

    await connectDB();

    app.get("/", (_req: express.Request, res: express.Response) => {
        return res.status(200).json({ message: "Welcome to EcommercePro API" });
    })

    // Routes
    app.use("/users", userRouter);
    app.use("/categories", categoryRouter);
    app.use("/brands", brandRouter);
    app.use("/products", productRouter);
    app.use("/cart", cartRouter);
    app.use("/orders", orderRouter);
    app.use("/wishlist", wishlistRouter);
    app.use("/coupons", couponRouter);
    app.use("/reviews", reviewRouter);

    // ❌ 404 handler
    app.use((req: Request, res: Response, next: NextFunction) => {
        next(new AppError(`Invalid URL: ${req.originalUrl}`, 404));
    });

    // ✅ Global Error handler
    app.use(
        (err: AppError, req: Request, res: Response, next: NextFunction) => {
            return res.status(err.statusCode || 500).json({
                message: err.message,
                ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
            });
        }
    );

    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default bootstrap;