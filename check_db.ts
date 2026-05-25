import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

async function run() {
    await mongoose.connect(process.env.DB_Url as string);
    const db = mongoose.connection.db;

    // Remove the zero-priced items from the cart to force the user to re-add it
    // Or just update them directly
    await db.collection("carts").updateMany(
        { "items.productId": new mongoose.Types.ObjectId("69c67c832a3bd7a69adfc55f") },
        { 
            $set: { 
                "items.$[elem].price": 20000,
                "items.$[elem].finalPrice": 16000
            } 
        },
        { arrayFilters: [ { "elem.productId": new mongoose.Types.ObjectId("69c67c832a3bd7a69adfc55f") } ] }
    );
    
    // Recalculate cart totals (Simplest way to ensure accuracy is just to drop the cart or tell user to clear it)
    await db.collection("carts").deleteMany({});

    console.log("Carts cleared so the user can see the updated prices when they re-add the product.");
    process.exit(0);
}
run();
