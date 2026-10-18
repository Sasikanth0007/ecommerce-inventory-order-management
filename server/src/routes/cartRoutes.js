const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../controllers/cartController");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.use(wrap(requireAuth));
router.get("/", wrap(getCart));
router.post("/", wrap(addToCart));
router.put("/:productId", wrap(updateCartItem));
router.delete("/:productId", wrap(removeFromCart));
router.delete("/", wrap(clearCart));

module.exports = router;
