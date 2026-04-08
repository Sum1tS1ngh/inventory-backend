const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

router.use(protect);

// ── GET /api/alerts/low-stock ─────────────────────────────────────────────────
router.get('/low-stock', async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      owner:    req.user._id,
      isActive: true,
      $expr:    { $lte: ['$quantity', '$minQuantity'] },
    }).select('name quantity minQuantity category');

    res.json({
      success: true,
      count:    lowStockProducts.length,
      hasAlerts: lowStockProducts.length > 0,
      alerts:   lowStockProducts.map((p) => ({
        id:          p._id,
        name:        p.name,
        quantity:    p.quantity,
        minQuantity: p.minQuantity,
        category:    p.category,
        message:     `"${p.name}" has only ${p.quantity} units left (minimum: ${p.minQuantity})`,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
