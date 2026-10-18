const Cart = require("../models/Cart");
const Product = require("../models/Product");

async function getCart(req, res) {
  const cart = await Cart.findOne({ userId: req.user.uid }).populate("items.product");
  res.json(cart || { userId: req.user.uid, items: [] });
}

async function addToCart(req, res) {
  const { productId } = req.body;
  const quantity = Number(req.body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity must be a positive whole number" });
  }
  const product = await Product.findById(productId);

  if (!product) return res.status(404).json({ message: "Product not found" });
  if (product.stock < quantity) return res.status(400).json({ message: "Not enough stock" });

  let cart = await Cart.findOne({ userId: req.user.uid });
  if (!cart) cart = new Cart({ userId: req.user.uid, items: [] });

  const existing = cart.items.find(item => item.product.toString() === productId);

  if (existing) {
    if (product.stock < existing.quantity + Number(quantity)) {
      return res.status(400).json({ message: "Not enough stock" });
    }
    existing.quantity += Number(quantity);
  } else {
    cart.items.push({ product: productId, quantity: Number(quantity) });
  }

  await cart.save();
  await cart.populate("items.product");
  res.status(201).json(cart);
}

async function removeFromCart(req, res) {
  const cart = await Cart.findOne({ userId: req.user.uid });
  if (!cart) return res.json({ userId: req.user.uid, items: [] });

  cart.items = cart.items.filter(
    item => item.product.toString() !== req.params.productId
  );

  await cart.save();
  await cart.populate("items.product");
  res.json(cart);
}

async function updateCartItem(req, res) {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity must be a positive whole number" });
  }
  const cart = await Cart.findOne({ userId: req.user.uid });
  const item = cart?.items.find((entry) => entry.product.toString() === req.params.productId);
  if (!item) return res.status(404).json({ message: "Cart item not found" });
  const product = await Product.findById(req.params.productId);
  if (!product || quantity > product.stock) return res.status(400).json({ message: "Quantity exceeds available stock" });
  item.quantity = quantity;
  await cart.save();
  await cart.populate("items.product");
  res.json(cart);
}

async function clearCart(req, res) {
  const cart = await Cart.findOne({ userId: req.user.uid });
  if (!cart) return res.json({ userId: req.user.uid, items: [] });

  cart.items = [];
  await cart.save();
  res.json(cart);
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
