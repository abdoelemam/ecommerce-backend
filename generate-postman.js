import fs from 'fs';

const baseUrl = "http://localhost:5000";

const collection = {
    info: {
        name: "EcommercePro APIs",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
        {
            name: "01. Users & Auth",
            item: [
                {
                    name: "Sign Up",
                    request: {
                        method: "POST",
                        header: [],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                username: "Abdo Elemam",
                                email: "test@test.com",
                                password: "password123",
                                cpassword: "password123",
                                phone: "01012345678",
                                age: 25,
                                gender: "male"
                            }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/users/signup", host: ["{{baseUrl}}"], path: ["users", "signup"] }
                    }
                },
                {
                    name: "Sign In",
                    request: {
                        method: "POST",
                        header: [],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ email: "test@test.com", password: "password123" }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/users/signin", host: ["{{baseUrl}}"], path: ["users", "signin"] }
                    }
                },
                {
                    name: "Refresh Token",
                    request: {
                        method: "POST",
                        header: [],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ refresh_token: "REPLACE_WITH_REFRESH_TOKEN" }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/users/refresh-token", host: ["{{baseUrl}}"], path: ["users", "refresh-token"] }
                    }
                },
                {
                    name: "Get My Profile",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/users/profile", host: ["{{baseUrl}}"], path: ["users", "profile"] }
                    }
                },
                {
                    name: "Update Profile",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ age: 26, phone: "01087654321" }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/users/profile", host: ["{{baseUrl}}"], path: ["users", "profile"] }
                    }
                },
                 {
                    name: "Change Password",
                    request: {
                        method: "PATCH",
                        header: [{ key: "token", value: "{{userToken}}" }],
                         body: {
                            mode: "raw",
                            raw: JSON.stringify({ oldPassword: "password123", newPassword: "newpassword123", cPassword: "newpassword123" }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/users/change-password", host: ["{{baseUrl}}"], path: ["users", "change-password"] }
                    }
                },
                {
                    name: "Delete Account",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/users/delete-account", host: ["{{baseUrl}}"], path: ["users", "delete-account"] }
                    }
                }
            ]
        },
        {
            name: "02. Categories",
            item: [
                {
                    name: "Get All Categories",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/categories", host: ["{{baseUrl}}"], path: ["categories"] } }
                },
                {
                    name: "Get Category By ID",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/categories/REPLACE_ID", host: ["{{baseUrl}}"], path: ["categories", "REPLACE_ID"] } }
                },
                 {
                    name: "Get Subcategories",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/categories/REPLACE_ID/subcategories", host: ["{{baseUrl}}"], path: ["categories", "REPLACE_ID", "subcategories"] } }
                },
                {
                    name: "Add Category (Admin)",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "Electronics", type: "text" },
                                { key: "image", type: "file", src: "" }
                            ]
                        },
                        url: { raw: "{{baseUrl}}/categories", host: ["{{baseUrl}}"], path: ["categories"] }
                    }
                },
                 {
                    name: "Update Category (Admin)",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "Phones", type: "text" },
                                { key: "image", type: "file", src: "" }
                            ]
                        },
                        url: { raw: "{{baseUrl}}/categories/REPLACE_ID", host: ["{{baseUrl}}"], path: ["categories", "REPLACE_ID"] }
                    }
                },
                {
                    name: "Delete Category (Admin)",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        url: { raw: "{{baseUrl}}/categories/REPLACE_ID", host: ["{{baseUrl}}"], path: ["categories", "REPLACE_ID"] }
                    }
                }
            ]
        },
        {
            name: "03. Brands",
            item: [
                {
                    name: "Get All Brands",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/brands", host: ["{{baseUrl}}"], path: ["brands"] } }
                },
                {
                    name: "Get Brand By ID",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/brands/REPLACE_ID", host: ["{{baseUrl}}"], path: ["brands", "REPLACE_ID"] } }
                },
                {
                    name: "Add Brand (Admin)",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "Samsung", type: "text" },
                                { key: "image", type: "file", src: "" }
                            ]
                        },
                        url: { raw: "{{baseUrl}}/brands", host: ["{{baseUrl}}"], path: ["brands"] }
                    }
                },
                 {
                    name: "Update Brand (Admin)",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "Apple", type: "text" },
                                { key: "image", type: "file", src: "" }
                            ]
                        },
                        url: { raw: "{{baseUrl}}/brands/REPLACE_ID", host: ["{{baseUrl}}"], path: ["brands", "REPLACE_ID"] }
                    }
                },
                {
                    name: "Delete Brand (Admin)",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        url: { raw: "{{baseUrl}}/brands/REPLACE_ID", host: ["{{baseUrl}}"], path: ["brands", "REPLACE_ID"] }
                    }
                }
            ]
        },
        {
            name: "04. Products",
            item: [
                {
                    name: "Get All Products",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/products", host: ["{{baseUrl}}"], path: ["products"] } }
                },
                 {
                    name: "Get Product By ID",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/products/REPLACE_ID", host: ["{{baseUrl}}"], path: ["products", "REPLACE_ID"] } }
                },
                {
                    name: "Add Product (Admin)",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "iPhone 15", type: "text" },
                                { key: "description", value: "A very good phone", type: "text" },
                                { key: "price", value: "1000", type: "text" },
                                { key: "discount", value: "10", type: "text" },
                                { key: "categoryId", value: "REPLACE_CAT_ID", type: "text" },
                                { key: "brandId", value: "REPLACE_BRAND_ID", type: "text" },
                                { key: "variants", value: "[{\"color\": \"Black\", \"size\": \"128GB\", \"stock\": 50, \"priceDiff\": 0}, {\"color\": \"White\", \"size\": \"256GB\", \"stock\": 30, \"priceDiff\": 100}]", type: "text", description: "Stringified JSON array of variants" },
                                { key: "images", type: "file", src: "" }
                            ]
                        },
                        url: { raw: "{{baseUrl}}/products", host: ["{{baseUrl}}"], path: ["products"] }
                    }
                },
                 {
                    name: "Update Product (Admin)",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "price", value: "900", type: "text" },
                                { key: "variants", value: "[{\"stock\": 20}]", type: "text" },
                                { key: "images", type: "file", src: "" }
                            ]
                        },
                        url: { raw: "{{baseUrl}}/products/REPLACE_ID", host: ["{{baseUrl}}"], path: ["products", "REPLACE_ID"] }
                    }
                },
                {
                    name: "Delete Product (Admin)",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        url: { raw: "{{baseUrl}}/products/REPLACE_ID", host: ["{{baseUrl}}"], path: ["products", "REPLACE_ID"] }
                    }
                }
            ]
        },
        {
            name: "05. Cart",
            item: [
                {
                    name: "Get My Cart",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/cart", host: ["{{baseUrl}}"], path: ["cart"] }
                    }
                },
                {
                    name: "Add Product To Cart",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                productId: "REPLACE_PRODUCT_ID",
                                variantId: "REPLACE_VARIANT_ID",
                                quantity: 1
                            }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/cart", host: ["{{baseUrl}}"], path: ["cart"] }
                    }
                },
                {
                    name: "Update Cart Item Quantity",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ quantity: 2 }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/cart/REPLACE_PRODUCT_ID", host: ["{{baseUrl}}"], path: ["cart", "REPLACE_PRODUCT_ID"] }
                    }
                },
                {
                    name: "Remove Cart Item",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/cart/REPLACE_PRODUCT_ID", host: ["{{baseUrl}}"], path: ["cart", "REPLACE_PRODUCT_ID"] }
                    }
                },
                {
                    name: "Clear Cart",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/cart", host: ["{{baseUrl}}"], path: ["cart"] }
                    }
                }
            ]
        },
        {
            name: "06. Coupons",
            item: [
                {
                    name: "Get All Coupons (Admin)",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        url: { raw: "{{baseUrl}}/coupons", host: ["{{baseUrl}}"], path: ["coupons"] }
                    }
                },
                {
                    name: "Create Coupon (Admin)",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                code: "SALE50",
                                discount: 50,
                                discountType: "fixedAmount",
                                expiresAt: "2026-12-31"
                            }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/coupons", host: ["{{baseUrl}}"], path: ["coupons"] }
                    }
                },
                {
                    name: "Update Coupon (Admin)",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ discount: 60 }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/coupons/REPLACE_ID", host: ["{{baseUrl}}"], path: ["coupons", "REPLACE_ID"] }
                    }
                },
                {
                    name: "Delete Coupon (Admin)",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        url: { raw: "{{baseUrl}}/coupons/REPLACE_ID", host: ["{{baseUrl}}"], path: ["coupons", "REPLACE_ID"] }
                    }
                },
                {
                    name: "Apply Coupon To Cart (User)",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ code: "SALE50" }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/coupons/apply", host: ["{{baseUrl}}"], path: ["coupons", "apply"] }
                    }
                },
                {
                    name: "Remove Coupon From Cart",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/coupons/remove", host: ["{{baseUrl}}"], path: ["coupons", "remove"] }
                    }
                }
            ]
        },
        {
            name: "07. Orders",
            item: [
                {
                    name: "Create Order From Cart",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                shippingAddress: { street: "123 Main St", city: "Cairo", phone: "01011111111" },
                                phone: "01011111111",
                                paymentMethod: "cash"
                            }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] }
                    }
                },
                {
                    name: "Get My Orders",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/orders/my-orders", host: ["{{baseUrl}}"], path: ["orders", "my-orders"] }
                    }
                },
                {
                    name: "Get Single Order",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/orders/REPLACE_ID", host: ["{{baseUrl}}"], path: ["orders", "REPLACE_ID"] }
                    }
                },
                 {
                    name: "Create Paymob Checkout Session",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/orders/REPLACE_ID/checkout-session", host: ["{{baseUrl}}"], path: ["orders", "REPLACE_ID", "checkout-session"] }
                    }
                },
                {
                    name: "Cancel Order",
                    request: {
                        method: "PATCH",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/orders/REPLACE_ID/cancel", host: ["{{baseUrl}}"], path: ["orders", "REPLACE_ID", "cancel"] }
                    }
                },
                {
                    name: "Get All Orders (Admin)",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] }
                    }
                },
                {
                    name: "Change Order Status (Admin)",
                    request: {
                        method: "PATCH",
                        header: [{ key: "token", value: "{{adminToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ status: "delivered" }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/orders/ORDER_ID/status", host: ["{{baseUrl}}"], path: ["orders", "ORDER_ID", "status"] }
                    }
                },
                {
                    name: "Paymob Webhook (Public)",
                    request: {
                        method: "POST",
                        header: [],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ obj: { order: { id: "paymob_order_id" }, success: true } }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/orders/webhook/paymob", host: ["{{baseUrl}}"], path: ["orders", "webhook", "paymob"] }
                    }
                }
            ]
        },
        {
            name: "08. Reviews",
            item: [
                {
                    name: "Get Product Reviews",
                    request: { method: "GET", header: [], url: { raw: "{{baseUrl}}/reviews/REPLACE_PRODUCT_ID", host: ["{{baseUrl}}"], path: ["reviews", "REPLACE_PRODUCT_ID"] } }
                },
                {
                    name: "Add Review",
                    request: {
                        method: "POST",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ comment: "Amazing product! Highly recommended.", rating: 5 }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/reviews/REPLACE_PRODUCT_ID", host: ["{{baseUrl}}"], path: ["reviews", "REPLACE_PRODUCT_ID"] }
                    }
                },
                {
                    name: "Update Review",
                    request: {
                        method: "PUT",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ comment: "Updated comment.", rating: 4 }, null, 4),
                            options: { raw: { language: "json" } }
                        },
                        url: { raw: "{{baseUrl}}/reviews/REPLACE_REVIEW_ID", host: ["{{baseUrl}}"], path: ["reviews", "REPLACE_REVIEW_ID"] }
                    }
                },
                {
                    name: "Delete Review",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/reviews/REPLACE_REVIEW_ID", host: ["{{baseUrl}}"], path: ["reviews", "REPLACE_REVIEW_ID"] }
                    }
                }
            ]
        },
        {
            name: "09. Wishlist",
            item: [
                {
                    name: "Get My Wishlist",
                    request: {
                        method: "GET",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/wishlist", host: ["{{baseUrl}}"], path: ["wishlist"] }
                    }
                },
                {
                    name: "Toggle Product To Wishlist",
                    request: {
                        method: "PATCH",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/wishlist/REPLACE_PRODUCT_ID", host: ["{{baseUrl}}"], path: ["wishlist", "REPLACE_PRODUCT_ID"] }
                    }
                },
                {
                    name: "Remove Specific Product",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/wishlist/REPLACE_PRODUCT_ID", host: ["{{baseUrl}}"], path: ["wishlist", "REPLACE_PRODUCT_ID"] }
                    }
                },
                {
                    name: "Clear Wishlist",
                    request: {
                        method: "DELETE",
                        header: [{ key: "token", value: "{{userToken}}" }],
                        url: { raw: "{{baseUrl}}/wishlist", host: ["{{baseUrl}}"], path: ["wishlist"] }
                    }
                }
            ]
        }
    ],
    variable: [
        { key: "baseUrl", value: "http://localhost:5000" },
        { key: "userToken", value: "REPLACE_WITH_USER_TOKEN" },
        { key: "adminToken", value: "REPLACE_WITH_ADMIN_TOKEN" }
    ]
};

fs.writeFileSync('EcommercePro.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection generated successfully!');
