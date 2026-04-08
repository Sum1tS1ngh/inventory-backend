const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Generate JWT ──────────────────────────────────────────────────────────────
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, email: this.email, storeName: this.storeName },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Generate password reset token (simple 6-digit OTP) ───────────────────────
userSchema.methods.generateResetToken = function () {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return token;
};

module.exports = mongoose.model('User', userSchema);
