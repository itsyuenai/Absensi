const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const User = require('../models/user');
const Absensi = require('../models/absensi');
const QrCode = require('../models/qrcode');
const PDFDocument = require('pdfkit'); // Tambahkan untuk PDF export
const ExcelJS = require('exceljs'); // Tambahkan untuk Excel export
const fs = require('fs');
const path = require('path');

// Generate QR code for attendance
exports.generateQR = async (req, res) => {
  try {
    // Generate a unique ID for the QR code
    const qrId = uuidv4();
    
    // Set expiry time to 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    // Create QR code in database
    const newQrCode = new QrCode({
      qrId,
      status: 'active',
      expiresAt
    });
    
    await newQrCode.save();
    
    // Generate QR code image
    const qrImage = await qrcode.toDataURL(qrId);
    
    res.json({ 
      success: true,
      qrId, 
      qr: qrImage,
      expiresAt
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ 
      success: false,
      message: "Gagal membuat QR code" 
    });
  }
};

// POST /api/absensi/scan
exports.scanQR = async (req, res) => {
  const { qrId } = req.body;
  const userId = req.user.userId; // dari JWT token yang sudah didecode

  try {
    const qrCode = await QrCode.findOne({ qrId, status: 'active' });

    if (!qrCode || qrCode.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "QR tidak valid atau kadaluarsa." });
    }

    // Tandai absen
    const newAbsen = new Absensi({
      user: userId,
      waktu: new Date(),
    });

    await newAbsen.save();

    // Set QR jadi tidak aktif (optional)
    qrCode.status = 'used';
    await qrCode.save();

    res.json({ success: true, message: "Absensi berhasil." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan." });
  }
};

// Process attendance based on scanned QR code
exports.processAbsensi = async (req, res) => {
  try {
    const { qrId } = req.body;
    const userId = req.user.userId; // Ambil dari JWT token
    
    if (!qrId || !userId) {
      return res.status(400).json({ 
        success: false,
        message: "QR code dan user ID diperlukan" 
      });
    }
    
    // Check if QR code exists and is active
    const qrCode = await QrCode.findOne({ qrId });
    
    if (!qrCode) {
      return res.status(404).json({ 
        success: false,
        message: "QR code tidak valid" 
      });
    }
    
    if (qrCode.status !== 'active') {
      return res.status(400).json({ 
        success: false,
        message: "QR code sudah digunakan atau kedaluwarsa" 
      });
    }
    
    // Check if QR code is expired
    if (new Date() > qrCode.expiresAt) {
      qrCode.status = 'expired';
      await qrCode.save();
      
      return res.status(400).json({ 
        success: false,
        message: "QR code sudah kedaluwarsa" 
      });
    }
    
    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User tidak ditemukan" 
      });
    }
    
    // Check if attendance already exists for this user and QR code
    const existingAbsensi = await Absensi.findOne({ 
      userId, 
      qrId 
    });
    
    if (existingAbsensi) {
      return res.status(400).json({ 
        success: false,
        message: "Anda sudah melakukan absensi hari ini" 
      });
    }
    
    // Process attendance
    const now = moment().tz('Asia/Jakarta');
    const day = now.isoWeekday(); // 1 = Monday, 7 = Sunday
    
    // Check if it's a weekday (Monday-Friday)
    if (day > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Absensi hanya tersedia pada hari Senin-Jumat' 
      });
    }
    
    const currentTime = now.format('HH:mm');
    const currentDate = now.format('YYYY-MM-DD');
    
    // Define attendance rules
    const startTime = moment.tz(currentDate + ' 07:30', 'Asia/Jakarta');
    const graceEndTime = moment.tz(currentDate + ' 07:45', 'Asia/Jakarta');
    
    let status = '';
    
    // Determine attendance status
    if (now.isBefore(startTime)) {
      return res.status(400).json({ 
        success: false,
        message: 'Absensi belum dibuka, mulai pukul 07:30 WIB' 
      });
    } else if (now.isBetween(startTime, graceEndTime, undefined, '[]')) {
      status = 'Ontime';
    } else {
      const minutesLate = now.diff(graceEndTime, 'minutes');
      status = `Terlambat ${minutesLate} menit`;
    }
    
    // Create new attendance record
    const newAbsensi = new Absensi({
      userId: user._id,
      nama: user.name,
      fakultas: user.fakultas,
      tanggal: currentDate,
      jam: currentTime,
      status: status,
      qrId: qrId
    });
    
    await newAbsensi.save();
    
    // Update QR code status to used
    qrCode.status = 'used';
    await qrCode.save();
    
    res.json({ 
      success: true,
      message: `Absensi berhasil dicatat (${status})` 
    });
  } catch (error) {
    console.error("Error processing attendance:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
};

// Get attendance statistics
exports.getStatistics = async (req, res) => {
  try {
    // Get date range (default: last 7 days)
    const endDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
    const startDate = moment().tz('Asia/Jakarta').subtract(7, 'days').format('YYYY-MM-DD');
    
    const attendanceData = await Absensi.aggregate([
      {
        $match: {
          tanggal: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            tanggal: "$tanggal",
            status: { $regexMatch: { input: "$status", regex: /^Ontime/ } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          tanggal: "$_id.tanggal",
          status: { $cond: [ "$_id.status", "Ontime", "Terlambat" ] },
          count: 1
        }
      },
      { $sort: { tanggal: 1, status: 1 } }
    ]);
    
    // Restructure data for Chart.js
    const dates = [...new Set(attendanceData.map(item => item.tanggal))].sort();
    
    const chartData = {
      labels: dates,
      datasets: [
        {
          label: 'Tepat Waktu',
          data: dates.map(date => {
            const entry = attendanceData.find(item => item.tanggal === date && item.status === 'Ontime');
            return entry ? entry.count : 0;
          })
        },
        {
          label: 'Terlambat',
          data: dates.map(date => {
            const entry = attendanceData.find(item => item.tanggal === date && item.status === 'Terlambat');
            return entry ? entry.count : 0;
          })
        }
      ]
    };
    
    res.json({ 
      success: true,
      data: chartData 
    });
  } catch (error) {
    console.error("Error getting statistics:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
};

// Get all attendance records
exports.getAllAbsensi = async (req, res) => {
  try {
    // Optional filters
    const { startDate, endDate, status, fakultas } = req.query;
    
    const filter = {};
    
    if (startDate && endDate) {
      filter.tanggal = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.tanggal = { $gte: startDate };
    } else if (endDate) {
      filter.tanggal = { $lte: endDate };
    }
    
    if (status) {
      if (status === 'ontime') {
        filter.status = 'Ontime';
      } else if (status === 'terlambat') {
        filter.status = { $regex: /^Terlambat/ };
      }
    }
    
    if (fakultas) {
      filter.fakultas = fakultas;
    }
    
    const absensiList = await Absensi.find(filter)
      .sort({ tanggal: -1, jam: 1 });
    
    res.json({ 
      success: true,
      data: absensiList 
    });
  } catch (error) {
    console.error("Error getting attendance records:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
};

// Get user's attendance records
exports.getUserAbsensi = async (req, res) => {
  try {
    const userId = req.user.userId; // Ambil dari token JWT
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID diperlukan" 
      });
    }
    
    const absensiList = await Absensi.find({ userId })
      .sort({ tanggal: -1, jam: 1 });
    
    res.json({ 
      success: true,
      data: absensiList 
    });
  } catch (error) {
    console.error("Error getting user attendance:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
};

// ExportPDF
exports.exportPDF = async (req, res) => {
  try {
    // Optional filters
    const { startDate, endDate, status, fakultas } = req.query;
    
    const filter = {};
    
    if (startDate && endDate) {
      filter.tanggal = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.tanggal = { $gte: startDate };
    } else if (endDate) {
      filter.tanggal = { $lte: endDate };
    }
    
    if (status) {
      if (status === 'ontime') {
        filter.status = 'Ontime';
      } else if (status === 'terlambat') {
        filter.status = { $regex: /^Terlambat/ };
      }
    }
    
    if (fakultas) {
      filter.fakultas = fakultas;
    }
    
    const absensiList = await Absensi.find(filter)
      .sort({ tanggal: 1, jam: 1 });
      
    if (absensiList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada data absensi untuk diekspor."
      });
    }
    
    // Create PDF document
    const doc = new PDFDocument();
    const filename = `absensi_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../temp', filename);
    
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'));
    }
    
    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filepath));
    
    // Add content to PDF
    doc.fontSize(20).text('Laporan Absensi', { align: 'center' });
    doc.moveDown();
    
    // Add filters info
    doc.fontSize(12).text(`Periode: ${startDate || 'Semua'} - ${endDate || 'Semua'}`);
    if (status) {
      doc.text(`Status: ${status === 'ontime' ? 'Tepat Waktu' : 'Terlambat'}`);
    }
    if (fakultas) {
      doc.text(`Fakultas: ${fakultas}`);
    }
    doc.moveDown();
    
    // Create table header
    const tableTop = 160;
    const colWidths = [30, 150, 100, 90, 90, 90];
    let currentY = tableTop;
    
    // Draw table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('No', 50, currentY);
    doc.text('Nama', 80, currentY);
    doc.text('Fakultas', 230, currentY);
    doc.text('Tanggal', 330, currentY);
    doc.text('Jam', 420, currentY);
    doc.text('Status', 490, currentY);
    
    currentY += 20;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;
    
    // Reset to regular font
    doc.font('Helvetica');
    
    // Add data rows
    absensiList.forEach((item, index) => {
      // Add a new page if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        doc.text('Laporan Absensi (lanjutan)', { align: 'center' });
        doc.moveDown();
        currentY += 30;
      }
      
      doc.text((index + 1).toString(), 50, currentY);
      doc.text(item.nama, 80, currentY);
      doc.text(item.fakultas, 230, currentY);
      doc.text(item.tanggal, 330, currentY);
      doc.text(item.jam, 420, currentY);
      doc.text(item.status, 490, currentY);
      
      currentY += 20;
    });
    
    // Finalize PDF
    doc.end();
    
    // Wait for the file to be written
    setTimeout(() => {
      // Send file
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res.status(500).json({
            success: false,
            message: "Gagal mengirim file PDF"
          });
        }
        
        // Delete file after sending
        fs.unlink(filepath, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      });
    }, 1000);
    
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan saat mengekspor ke PDF" 
    });
  }
};

// Export to Excel
exports.exportExcel = async (req, res) => {
  try {
    // Optional filters
    const { startDate, endDate, status, fakultas } = req.query;
    
    const filter = {};
    
    if (startDate && endDate) {
      filter.tanggal = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.tanggal = { $gte: startDate };
    } else if (endDate) {
      filter.tanggal = { $lte: endDate };
    }
    
    if (status) {
      if (status === 'ontime') {
        filter.status = 'Ontime';
      } else if (status === 'terlambat') {
        filter.status = { $regex: /^Terlambat/ };
      }
    }
    
    if (fakultas) {
      filter.fakultas = fakultas;
    }
    
    const absensiList = await Absensi.find(filter)
      .sort({ tanggal: 1, jam: 1 });
      
    if (absensiList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada data absensi untuk diekspor."
      });
    }
    
    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Absensi');
    
    // Add header row with styling
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama', key: 'nama', width: 30 },
      { header: 'Fakultas', key: 'fakultas', width: 20 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Jam', key: 'jam', width: 10 },
      { header: 'Status', key: 'status', width: 20 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data rows
    absensiList.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        nama: item.nama,
        fakultas: item.fakultas,
        tanggal: item.tanggal, 
        jam: item.jam,
        status: item.status
      });
    });
    
    // Add summary/filter information at the bottom
    const summaryRowIndex = absensiList.length + 3;
    worksheet.getCell(`A${summaryRowIndex}`).value = 'Informasi Filter:';
    worksheet.getCell(`A${summaryRowIndex}`).font = { bold: true };
    
    worksheet.getCell(`A${summaryRowIndex + 1}`).value = 'Periode:';
    worksheet.getCell(`B${summaryRowIndex + 1}`).value = `${startDate || 'Semua'} - ${endDate || 'Semua'}`;
    
    if (status) {
      worksheet.getCell(`A${summaryRowIndex + 2}`).value = 'Status:';
      worksheet.getCell(`B${summaryRowIndex + 2}`).value = status === 'ontime' ? 'Tepat Waktu' : 'Terlambat';
    }
    
    if (fakultas) {
      worksheet.getCell(`A${summaryRowIndex + 3}`).value = 'Fakultas:';
      worksheet.getCell(`B${summaryRowIndex + 3}`).value = fakultas;
    }
    
    // Create file path for temporary storage
    const filename = `absensi_${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, '../temp', filename);
    
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'));
    }
    
    // Write to file
    await workbook.xlsx.writeFile(filepath);
    
    // Send file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        return res.status(500).json({
          success: false,
          message: "Gagal mengirim file Excel"
        });
      }
      
      // Delete file after sending
      fs.unlink(filepath, (err) => {
        if (err) console.error("Error deleting temp file:", err);
      });
    });
    
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan saat mengekspor ke Excel" 
    });
  }
};

// Tambahan: Fungsi untuk mendapatkan ringkasan kehadiran per fakultas
exports.getFakultasStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    
    if (startDate && endDate) {
      matchQuery.tanggal = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      matchQuery.tanggal = { $gte: startDate };
    } else if (endDate) {
      matchQuery.tanggal = { $lte: endDate };
    }
    
    const statistics = await Absensi.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            fakultas: "$fakultas",
            status: { $regexMatch: { input: "$status", regex: /^Ontime/ } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          fakultas: "$_id.fakultas",
          status: { $cond: [ "$_id.status", "Ontime", "Terlambat" ] },
          count: 1
        }
      },
      { $sort: { fakultas: 1, status: 1 } }
    ]);
    
    // Restrukturisasi data untuk tampilan chart
    const fakultasList = [...new Set(statistics.map(item => item.fakultas))];
    
    const chartData = {
      labels: fakultasList,
      datasets: [
        {
          label: 'Tepat Waktu',
          data: fakultasList.map(fakultas => {
            const entry = statistics.find(item => item.fakultas === fakultas && item.status === 'Ontime');
            return entry ? entry.count : 0;
          })
        },
        {
          label: 'Terlambat',
          data: fakultasList.map(fakultas => {
            const entry = statistics.find(item => item.fakultas === fakultas && item.status === 'Terlambat');
            return entry ? entry.count : 0;
          })
        }
      ]
    };
    
    res.json({ 
      success: true,
      data: chartData 
    });
  } catch (error) {
    console.error("Error getting faculty statistics:", error);
    res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
};

// Tambahan: Fungsi untuk menghapus data absensi
exports.deleteAbsensi = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID absensi diperlukan"
      });
    }
    
    const deletedAbsensi = await Absensi.findByIdAndDelete(id);
    
    if (!deletedAbsensi) {
      return res.status(404).json({
        success: false,
        message: "Data absensi tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "Data absensi berhasil dihapus"
    });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus data absensi"
    });
  }
};