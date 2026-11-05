import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true });
const User = mongoose.model("User", userSchema);

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  type: { type: String, enum: ["income", "expense"], required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, default: "" }
}, { timestamps: true });
const Transaction = mongoose.model("Transaction", transactionSchema);

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  month: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 }
}, { timestamps: true });
budgetSchema.index({ user: 1, month: 1 }, { unique: true });
const Budget = mongoose.model("Budget", budgetSchema);

const auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Please log in." });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch { res.status(401).json({ message: "Session expired. Please log in again." }); }
};

app.get("/api/health", (_, res) => res.json({ status: "ok", app: "Finora API" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6)
      return res.status(400).json({ message: "Enter name, valid email and password (at least 6 characters)." });
    if (await User.findOne({ email })) return res.status(409).json({ message: "Email already registered." });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ message: "Could not create account." }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ message: "Incorrect email or password." });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch { res.status(500).json({ message: "Login failed." }); }
});

app.get("/api/transactions", auth, async (req, res) => {
  const rows = await Transaction.find({ user: req.userId }).sort({ date: -1, createdAt: -1 });
  res.json(rows);
});
app.post("/api/transactions", auth, async (req, res) => {
  try {
    const { title, amount, type, category, date, note } = req.body;
    if (!title?.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
        !["income", "expense"].includes(type) || !category)
      return res.status(400).json({ message: "Please provide valid transaction details." });
    const row = await Transaction.create({ user: req.userId, title, amount: Number(amount), type, category, date: date || new Date(), note });
    res.status(201).json(row);
  } catch { res.status(500).json({ message: "Could not save transaction." }); }
});
app.delete("/api/transactions/:id", auth, async (req, res) => {
  const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!deleted) return res.status(404).json({ message: "Transaction not found." });
  res.json({ message: "Transaction deleted." });
});

app.get("/api/budgets", auth, async (req, res) => {
  res.json(await Budget.find({ user: req.userId }).sort({ month: -1 }));
});
app.put("/api/budgets/:month", auth, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a valid budget." });
  const budget = await Budget.findOneAndUpdate(
    { user: req.userId, month: req.params.month },
    { amount }, { new: true, upsert: true, runValidators: true }
  );
  res.json(budget);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Finora API running at http://localhost:${PORT}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
