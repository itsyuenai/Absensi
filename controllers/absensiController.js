const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const User = require('../models/user');
const Absensi = require('../models/absensi');
const QrCode = require('../models/qrcode');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Middleware JWT auth
const authMiddleware = require('../middleware/authMiddleware');

exports.generateQR = async (req, res) => {
  try {
    const userId = req.user.userId;
    const qrId = uuidv4();
    const expiresAt = new Date(Date.now() + 86400000);

    const newQrCode = new QrCode({ qrId, userId, status: 'active', expiresAt });
    await newQrCode.save();

<<<<<<< HEAD
    const baseUrl = 'http://localhost:3000';
=======
    const baseUrl = 'https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app';
>>>>>>> b84f276c4b90897806c547dbc086dafdce58ff56
    const qrUrl = `${baseUrl}/api/absensi/scan-link?user_id=${userId}`;
    const qrBuffer = await qrcode.toBuffer(qrUrl);

    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    console.error("Error generating QR image:", error);
    res.status(500).send("Failed to generate QR image");
  }
};

exports.scanViaLink = async (req, res) => {
  const userId = req.query.user_id;
  if (!qrCode || qrCode.status !== 'active' || new Date() > qrCode.expiresAt) {
    return res.status(400).send("QR tidak aktif atau sudah kedaluwarsa.");
  }
  
  try {
    const now = moment().tz('Asia/Jakarta');
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');
    const user = await User.findById(userId);

    if (!user) return res.status(404).send("User not found.");
    const existing = await Absensi.findOne({ userId, tanggal: currentDate });
    if (existing) return res.send("You have already checked in today.");

    // Remove time restrictions - accept attendance 24/7
    // Set status based on current time (for informational purposes only)
    const startTime = moment.tz(currentDate + ' 07:30', 'Asia/Jakarta');
    const graceEndTime = moment.tz(currentDate + ' 07:45', 'Asia/Jakarta');
    
    // Determine attendance status but don't restrict based on time
    let status;
    if (now.isBetween(startTime, graceEndTime, undefined, '[]')) {
      status = 'Ontime';
    } else if (now.isBefore(startTime)) {
      status = 'Early';
    } else {
      status = `Late ${now.diff(graceEndTime, 'minutes')} minutes`;
    }

    const newAbsen = new Absensi({ userId: user._id, nama: user.name, fakultas: user.fakultas, tanggal: currentDate, jam: currentTime, status });
    await newAbsen.save();

    const qrCode = await QrCode.findOne({ userId, status: 'active' });
    if (qrCode) {
      qrCode.status = 'used';
      await qrCode.save();
    }

    return res.send(`Attendance recorded successfully! Status: ${status}`);
  } catch (err) {
    console.error("Error scan via link:", err);
    return res.status(500).send("Error recording attendance.");
  }
};

exports.processAttendance = async (req, res) => {
  try {
    const { qrId } = req.body;
    const userId = req.user.userId;

    const qrCode = await QrCode.findOne({ qrId, status: 'active' });
    if (!qrCode) return res.status(400).json({ success: false, message: "QR Code invalid or already used" });
    if (new Date() > qrCode.expiresAt) return res.status(400).json({ success: false, message: "QR Code expired" });

    const now = moment().tz('Asia/Jakarta');
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    const existing = await Absensi.findOne({ userId, tanggal: currentDate });
    if (existing) return res.status(400).json({ success: false, message: "You have already checked in today" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Reference times for status determination
    const startTime = moment.tz(currentDate + ' 07:30', 'Asia/Jakarta');
    const graceEndTime = moment.tz(currentDate + ' 07:45', 'Asia/Jakarta');

    // Determine status but don't block attendance based on time
    let status;
    if (now.isBetween(startTime, graceEndTime, undefined, '[]')) {
      status = 'Ontime';
    } else if (now.isBefore(startTime)) {
      status = 'Early';
    } else {
      status = `Late ${now.diff(graceEndTime, 'minutes')} minutes`;
    }

    const newAbsen = new Absensi({ userId: user._id, nama: user.name, fakultas: user.fakultas, tanggal: currentDate, jam: currentTime, status });
    await newAbsen.save();

    qrCode.status = 'used';
    await qrCode.save();

    res.json({ success: true, message: `Attendance recorded successfully (${status})` });
  } catch (error) {
    console.error("Error processing attendance:", error);
    res.status(500).json({ success: false, message: "Server error occurred" });
  }
};

// Get all attendance records
exports.getAllAbsensi = async (req, res) => {
  try {
    const absensi = await Absensi.find();
    res.json({ success: true, data: absensi });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ success: false, message: "Server error occurred" });
  }
};

// Get attendance records for a specific user
exports.getUserAbsensi = async (req, res) => {
  try {
    const { userId } = req.params;
    const absensi = await Absensi.find({ userId });
    res.json({ success: true, data: absensi });
  } catch (error) {
    console.error("Error fetching user attendance records:", error);
    res.status(500).json({ success: false, message: "Server error occurred" });
  }
};

// Get attendance statistics
exports.getStatistics = async (req, res) => {
  try {
    // Get counts for different status types
    const totalCount = await Absensi.countDocuments();
    const ontimeCount = await Absensi.countDocuments({ status: 'Ontime' });
    const lateCount = await Absensi.countDocuments({ status: { $regex: /^Late/ } });
    const earlyCount = await Absensi.countDocuments({ status: 'Early' });
    
    // Get faculty distribution
    const facultyDistribution = await Absensi.aggregate([
      { $group: { _id: "$fakultas", count: { $sum: 1 } } }
    ]);
    
    res.json({ 
      success: true, 
      statistics: {
        total: totalCount,
        ontime: ontimeCount,
        late: lateCount,
        early: earlyCount,
        facultyDistribution
      } 
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ success: false, message: "Server error occurred" });
  }
};

exports.exportAbsensiPDF = async (req, res) => {
  try {
    const { bulan, fakultas } = req.query;
    let query = {};
    if (bulan) query.tanggal = { $regex: `^${bulan}` };
    if (fakultas) query.fakultas = fakultas;

    const absensi = await Absensi.find(query);
    const doc = new PDFDocument();
    const filePath = path.join(__dirname, '../exports/absensi.pdf');
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('Data Absensi', { align: 'center' });
    doc.moveDown();

    absensi.forEach((absen, idx) => {
      doc.fontSize(12).text(`${idx + 1}. ${absen.nama} | ${absen.fakultas} | ${absen.tanggal} | ${absen.jam} | ${absen.status}`);
    });

    doc.end();

    res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to export PDF' });
<<<<<<< HEAD
  }
};

exports.exportAbsensiExcel = async (req, res) => {
  try {
    const { bulan, fakultas } = req.query;
    let query = {};
    if (bulan) query.tanggal = { $regex: `^${bulan}` };
    if (fakultas) query.fakultas = fakultas;

    const absensi = await Absensi.find(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Absensi');

    worksheet.columns = [
      { header: 'Nama', key: 'nama' },
      { header: 'Fakultas', key: 'fakultas' },
      { header: 'Tanggal', key: 'tanggal' },
      { header: 'Jam', key: 'jam' },
      { header: 'Status', key: 'status' }
    ];

    absensi.forEach(absen => worksheet.addRow(absen));

    const filePath = path.join(__dirname, '../exports/absensi.xlsx');
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to export Excel' });
=======
>>>>>>> b84f276c4b90897806c547dbc086dafdce58ff56
  }
};

exports.exportAbsensiExcel = async (req, res) => {
  try {
    const { bulan, fakultas } = req.query;
    let query = {};
    if (bulan) query.tanggal = { $regex: `^${bulan}` };
    if (fakultas) query.fakultas = fakultas;

    const absensi = await Absensi.find(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Absensi');

    worksheet.columns = [
      { header: 'Nama', key: 'nama' },
      { header: 'Fakultas', key: 'fakultas' },
      { header: 'Tanggal', key: 'tanggal' },
      { header: 'Jam', key: 'jam' },
      { header: 'Status', key: 'status' }
    ];

    absensi.forEach(absen => worksheet.addRow(absen));

    const filePath = path.join(__dirname, '../exports/absensi.xlsx');
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
};
