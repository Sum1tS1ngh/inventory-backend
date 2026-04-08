const express = require('express');
const { DateTime } = require('luxon');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

router.use(protect);

/** IANA timezone for “business day” in reports (works when server runs in UTC). */
const REPORT_TZ = process.env.REPORT_TIMEZONE || 'Asia/Kolkata';

function todayYMDInReportZone() {
  return DateTime.now().setZone(REPORT_TZ).toFormat('yyyy-MM-dd');
}

function parseReportDayBounds(dateStr) {
  const start = DateTime.fromISO(dateStr, { zone: REPORT_TZ }).startOf('day');
  const end = DateTime.fromISO(dateStr, { zone: REPORT_TZ }).endOf('day');
  return { start: start.toJSDate(), end: end.toJSDate() };
}

function saleYMDInReportZone(saleDate) {
  return DateTime.fromJSDate(new Date(saleDate)).setZone(REPORT_TZ).toFormat('yyyy-MM-dd');
}

// ── GET /api/reports/daily ────────────────────────────────────────────────────
// Query: ?date=2024-01-15  (defaults to “today” in REPORT_TIMEZONE)
router.get('/daily', async (req, res) => {
  try {
    const dateStr = req.query.date || todayYMDInReportZone();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }
    if (!DateTime.fromISO(dateStr, { zone: REPORT_TZ }).isValid) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }
    const { start, end } = parseReportDayBounds(dateStr);

    const sales = await Sale.find({
      owner: req.user._id,
      saleDate: { $gte: start, $lte: end },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const productMap = {};

    sales.forEach((sale) => {
      totalRevenue += sale.totalRevenue;
      totalCost += sale.totalCost;
      totalProfit += sale.totalProfit;

      sale.items.forEach((item) => {
        const key = item.productName;
        if (!productMap[key]) {
          productMap[key] = { name: key, quantitySold: 0, revenue: 0, profit: 0 };
        }
        productMap[key].quantitySold += item.quantity;
        productMap[key].revenue += item.totalRevenue;
        productMap[key].profit += item.profit;
      });
    });

    const productList = Object.values(productMap).sort((a, b) => b.quantitySold - a.quantitySold);
    const mostSelling = productList[0] || null;
    const leastSelling = productList[productList.length - 1] || null;

    const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, transactions: 0 }));
    sales.forEach((sale) => {
      const h = DateTime.fromJSDate(new Date(sale.saleDate)).setZone(REPORT_TZ).hour;
      hourlyData[h].revenue += sale.totalRevenue;
      hourlyData[h].transactions += 1;
    });

    res.json({
      success: true,
      date: dateStr,
      reportToday: todayYMDInReportZone(),
      timezone: REPORT_TZ,
      totalTransactions: sales.length,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
      mostSelling,
      leastSelling,
      productBreakdown: productList,
      hourlyData: hourlyData.filter((h) => h.transactions > 0),
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/reports/weekly ───────────────────────────────────────────────────
router.get('/weekly', async (req, res) => {
  try {
    const nowZ = DateTime.now().setZone(REPORT_TZ);
    const end = nowZ.endOf('day').toJSDate();
    const start = nowZ.minus({ days: 6 }).startOf('day').toJSDate();

    const sales = await Sale.find({ owner: req.user._id, saleDate: { $gte: start, $lte: end } });

    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = nowZ.minus({ days: i }).startOf('day');
      const key = d.toFormat('yyyy-MM-dd');
      dayMap[key] = { date: key, revenue: 0, profit: 0, transactions: 0 };
    }

    sales.forEach((sale) => {
      const key = saleYMDInReportZone(sale.saleDate);
      if (dayMap[key]) {
        dayMap[key].revenue += sale.totalRevenue;
        dayMap[key].profit += sale.totalProfit;
        dayMap[key].transactions += 1;
      }
    });

    const totalRevenue = sales.reduce((s, x) => s + x.totalRevenue, 0);
    const totalProfit = sales.reduce((s, x) => s + x.totalProfit, 0);

    res.json({
      success: true,
      timezone: REPORT_TZ,
      totalRevenue,
      totalProfit,
      totalTransactions: sales.length,
      dailyBreakdown: Object.values(dayMap),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/reports/summary ──────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const ymd = todayYMDInReportZone();
    const { start, end } = parseReportDayBounds(ymd);

    const [totalProducts, lowStockProducts, todaySales] = await Promise.all([
      Product.countDocuments({ owner: req.user._id, isActive: true }),
      Product.countDocuments({
        owner: req.user._id,
        isActive: true,
        $expr: { $lte: ['$quantity', '$minQuantity'] },
      }),
      Sale.find({
        owner: req.user._id,
        saleDate: { $gte: start, $lte: end },
      }),
    ]);

    const todayRevenue = todaySales.reduce((s, x) => s + x.totalRevenue, 0);
    const todayProfit = todaySales.reduce((s, x) => s + x.totalProfit, 0);

    res.json({
      success: true,
      timezone: REPORT_TZ,
      totalProducts,
      lowStockProducts,
      todayTransactions: todaySales.length,
      todayRevenue,
      todayProfit,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
