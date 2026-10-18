require("dotenv").config();

const connectDB = require("./config/db");
const Product = require("./models/Product");

const products = [
  {
    name: "Wireless Headphones",
    description: "Comfortable over-ear wireless headphones.",
    price: 2499,
    category: "Electronics",
    image: "https://placehold.co/600x400?text=Headphones",
    stock: 20
  },
  {
    name: "Smart Watch",
    description: "Fitness tracking and notifications on your wrist.",
    price: 3999,
    category: "Electronics",
    image: "https://placehold.co/600x400?text=Smart+Watch",
    stock: 15
  },
  {
    name: "Running Shoes",
    description: "Lightweight shoes for everyday running.",
    price: 2999,
    category: "Fashion",
    image: "https://placehold.co/600x400?text=Running+Shoes",
    stock: 25
  },
  {
    name: "Backpack",
    description: "Durable backpack suitable for college and travel.",
    price: 1499,
    category: "Fashion",
    image: "https://placehold.co/600x400?text=Backpack",
    stock: 30
  }
];

async function seed() {
  await connectDB();
  for (const product of products) {
    await Product.updateOne({ name: product.name }, { $setOnInsert: product }, { upsert: true });
  }
  console.log("Sample products added (existing products were kept)");
  await require("mongoose").disconnect();
}

seed().catch(async (error) => {
  console.error("Seeding failed:", error.message);
  await require("mongoose").disconnect();
  process.exitCode = 1;
});
