import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.mjs";
import projectRoutes from "./routes/projectRoutes.mjs";
import itemRoutes from "./routes/itemRoutes.mjs";


dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://craftchain2.netlify.app/"
  ],
  credentials: true
}));
app.use(express.json());
app.use("/auth",authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/items", itemRoutes);


app.get("/", (req, res) => {
  res.send("CraftChain backend running");
});

const PORT = process.env.PORT || 5050;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  })
  .catch((err) => {
    console.error("DB error", err);
  });
