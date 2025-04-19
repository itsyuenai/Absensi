const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QrCodeSchema = new Schema({
  qrId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('QrCode', QrCodeSchema);