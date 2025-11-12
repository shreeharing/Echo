import dotenv from "dotenv";
dotenv.config();
import express from "express";
import authRoutes from "./src/routes/auth.routes.js";
import connectDB from "./src/config/database.js";
import cors from "cors";
import rateLimit from 'express-rate-limit';



const app = express();

app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 requests per IP in 15 minutes
    message: 'Too many signup attempts from this IP, please try again after 15 minutes',
});

app.use("/api/auth",authLimiter,authRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT,()=>{
    console.log(`Server is running at port : ${PORT}`);
    //connecting the database
    connectDB();
});