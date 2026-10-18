const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");

async function createOrder(req, res) {
  const cart = await Cart.findOne({ userId: req.user.uid }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const item of cart.items) {
    if (!item.product) {
      return res.status(400).json({ message: "A product in your cart no longer exists" });
    }

    if (item.product.stock < item.quantity) {
      return res.status(400).json({ message: `Not enough stock for ${item.product.name}` });
    }

    totalAmount += item.product.price * item.quantity;
    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    });
  }

  // The stock condition is part of each database update, preventing overselling
  // when two checkouts race. If a later step fails, restore earlier deductions.
  const deducted = [];
  let createdOrder;
  try {
    for (const item of cart.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!product) throw new Error(`Not enough stock for ${item.product.name}`);
      deducted.push(item);
    }

    createdOrder = await Order.create({ userId: req.user.uid, items: orderItems, totalAmount });
    cart.items = [];
    await cart.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    if (createdOrder) await Order.deleteOne({ _id: createdOrder._id });
    await Promise.all(deducted.map((item) => Product.updateOne(
      { _id: item.product._id }, { $inc: { stock: item.quantity } }
    )));
    res.status(400).json({ message: error.message || "Could not place order" });
  }
}

async function getMyOrders(req, res) {
  const orders = await Order.find({ userId: req.user.uid }).sort({ createdAt: -1 });
  res.json(orders);
}

async function getAllOrders(req, res) {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
}

async function updateOrderStatus(req, res) {
  const { status } = req.body;
  if (!["Pending", "Confirmed", "Delivered"].includes(status)) {
    return res.status(400).json({ message: "Status must be Pending, Confirmed, or Delivered" });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus };
