const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
      min: [0, 'Buy price cannot be negative'],
    },
    sellPrice: {
      type: Number,
      required: [true, 'Sell price is required'],
      min: [0, 'Sell price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    minQuantity: {
      type: Number,
      required: [true, 'Minimum quantity is required'],
      min: [0, 'Minimum quantity cannot be negative'],
      default: 5,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── Virtual: is low stock ─────────────────────────────────────────────────────
productSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minQuantity;
});

// ── Virtual: profit margin ────────────────────────────────────────────────────
productSchema.virtual('profitMargin').get(function () {
  if (this.buyPrice === 0) return 0;
  return (((this.sellPrice - this.buyPrice) / this.buyPrice) * 100).toFixed(2);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// ── Text index for search ─────────────────────────────────────────────────────
productSchema.index({ name: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
