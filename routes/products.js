const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// All routes protected
router.use(protect);

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    const filter = { owner: req.user._id, isActive: true };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$minQuantity'] };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/products/low-stock ───────────────────────────────────────────────
router.get('/low-stock', async (req, res) => {
  try {
    const products = await Product.find({
      owner: req.user._id,
      isActive: true,
      $expr: { $lte: ['$quantity', '$minQuantity'] },
    });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, owner: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/products ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, buyPrice, sellPrice, quantity, minQuantity, category } = req.body;
    if (!name || buyPrice == null || sellPrice == null || quantity == null || minQuantity == null) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const product = await Product.create({
      owner: req.user._id,
      name,
      buyPrice: Number(buyPrice),
      sellPrice: Number(sellPrice),
      quantity: Number(quantity),
      minQuantity: Number(minQuantity),
      category: category || 'General',
    });

    res.status(201).json({ success: true, message: 'Product added successfully!', product });
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, buyPrice, sellPrice, quantity, minQuantity, category } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      {
        ...(name && { name }),
        ...(buyPrice != null && { buyPrice: Number(buyPrice) }),
        ...(sellPrice != null && { sellPrice: Number(sellPrice) }),
        ...(quantity != null && { quantity: Number(quantity) }),
        ...(minQuantity != null && { minQuantity: Number(minQuantity) }),
        ...(category && { category }),
      },
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated successfully!', product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
