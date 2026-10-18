const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { createOrder, getMyOrders, getAllOrders, updateOrderStatus } = require("../controllers/orderController");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.use(wrap(requireAuth));
router.get("/admin", wrap(requireAdmin), wrap(getAllOrders));
router.get("/", wrap(getMyOrders));
router.post("/", wrap(createOrder));
router.patch("/:id/status", wrap(requireAdmin), wrap(updateOrderStatus));

module.exports = router;
