const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AbsensiSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nama: {
    type: String,
    required: true
  },
  fakultas: {
    type: String,
    required: true
  },
  tanggal: {
    type: String,
    required: true
  },
  jam: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  qrId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Absensi', AbsensiSchema);