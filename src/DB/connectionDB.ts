import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_Url as unknown as string);
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.log("fail to connect DB", error);
    }
}

export default connectDB;