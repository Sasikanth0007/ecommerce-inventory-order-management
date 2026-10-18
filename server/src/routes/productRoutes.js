const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/", wrap(getProducts));
router.get("/:id", wrap(getProductById));
router.post("/", wrap(requireAuth), wrap(requireAdmin), wrap(createProduct));
router.put("/:id", wrap(requireAuth), wrap(requireAdmin), wrap(updateProduct));
router.delete("/:id", wrap(requireAuth), wrap(requireAdmin), wrap(deleteProduct));

module.exports = router;
