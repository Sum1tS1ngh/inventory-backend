const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

router.use(protect);

// ── POST /api/sales ────────────────────────────────────────────────────────────
// Body: { items: [{ productId, quantity }], note }
router.post('/', async (req, res) => {
  try {
    const { items, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale items are required.' });
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const saleItems = [];
    const lowStockAlerts = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, owner: req.user._id, isActive: true });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
        });
      }

      const itemRevenue = product.sellPrice * item.quantity;
      const itemCost    = product.buyPrice  * item.quantity;
      const itemProfit  = itemRevenue - itemCost;

      saleItems.push({
        product:      product._id,
        productName:  product.name,
        quantity:     item.quantity,
        buyPrice:     product.buyPrice,
        sellPrice:    product.sellPrice,
        totalRevenue: itemRevenue,
        totalCost:    itemCost,
        profit:       itemProfit,
      });

      totalRevenue += itemRevenue;
      totalCost    += itemCost;

      // Deduct stock
      product.quantity -= item.quantity;
      await product.save();

      // Check low stock after sale
      if (product.quantity <= product.minQuantity) {
        lowStockAlerts.push({ name: product.name, quantity: product.quantity, minQuantity: product.minQuantity });
      }
    }

    const sale = await Sale.create({
      owner:        req.user._id,
      items:        saleItems,
      totalRevenue,
      totalCost,
      totalProfit:  totalRevenue - totalCost,
      note,
    });

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully!',
      sale,
      lowStockAlerts,
    });
  } catch (err) {
    console.error('Sale error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/sales ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    const filter = { owner: req.user._id };

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate)   filter.saleDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const sales = await Sale.find(filter).sort({ saleDate: -1 }).limit(Number(limit));
    res.json({ success: true, count: sales.length, sales });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
