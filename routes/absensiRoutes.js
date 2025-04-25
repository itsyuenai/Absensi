const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const { authMiddleware } = require('../middleware/authMiddleware');
console.log("authMiddleware typeof:", typeof authMiddleware);
console.log("authMiddleware:", authMiddleware);

// Semua API protected
router.use(authMiddleware);

// QR Code
router.get('/generate-qr', absensiController.generateQR);

// Scan Link
router.get('/scan-link', absensiController.scanViaLink);

// Process Scan
router.post('/process', absensiController.processAttendance);

// Absensi List
router.get('/list', absensiController.getAllAbsensi);

// User Absensi
router.get('/user/:userId', absensiController.getUserAbsensi);

// Export ke PDF
router.get('/export-pdf', absensiController.exportAbsensiPDF);

// Export ke Excel
router.get('/export-excel', absensiController.exportAbsensiExcel);

// Statistik route
router.get('/statistics', absensiController.getStatistics);

module.exports = router;
