const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName:  { type: String, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  buyPrice:     { type: Number, required: true },
  sellPrice:    { type: Number, required: true },
  totalRevenue: { type: Number, required: true },
  totalCost:    { type: Number, required: true },
  profit:       { type: Number, required: true },
});

const saleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items:        { type: [saleItemSchema], required: true },
    totalRevenue: { type: Number, required: true },
    totalCost:    { type: Number, required: true },
    totalProfit:  { type: Number, required: true },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
