import mongoose from "mongoose";

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.DB_STRING);
        console.log("MongoDB connected......");
    } catch (error) {
        console.log("Error While connecting to database : ",error.message);
        //Exit process with failure
        process.exit(1);
    }
}

export default connectDB;