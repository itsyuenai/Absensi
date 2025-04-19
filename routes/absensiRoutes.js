const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');

// Generate QR code for attendance
router.get('/generate-qr', absensiController.generateQR);

// Process attendance
router.post('/process', absensiController.processAbsensi);

// Get attendance statistics
router.get('/statistics', absensiController.getStatistics);

// Get all attendance records
router.get('/list', absensiController.getAllAbsensi);

// Get user's attendance records
router.get('/user/:userId', absensiController.getUserAbsensi);

module.exports = router;