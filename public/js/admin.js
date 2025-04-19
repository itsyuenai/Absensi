// admin.js - Handles QR code generation for attendance sessions

document.addEventListener('DOMContentLoaded', function() {
    // Verify user is admin
    verifyAdminAccess();
    
    // Setup QR form
    setupQRForm();
});

// Verify current user has admin access
function verifyAdminAccess() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'admin') {
        alert('Halaman ini hanya dapat diakses oleh administrator');
        window.location.href = 'index.html';
    }
}

// Setup QR code generation form
function setupQRForm() {
    const qrForm = document.getElementById('qr-form');
    
    qrForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const mataKuliah = document.getElementById('mata-kuliah').value;
        const kelas = document.getElementById('kelas').value;
        const durasi = parseInt(document.getElementById('durasi').value);
        
        // Generate QR data
        generateQRCode(mataKuliah, kelas, durasi);
    });
}

// Generate QR code with class info
function generateQRCode(mataKuliah, kelas, durasi) {
    // Clear previous QR code
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = '';
    
    // Calculate expiry time
    const now = new Date();
    const expiryTime = new Date(now.getTime() + durasi * 60000); // Convert minutes to milliseconds
    
    // Create QR data object
    const qrData = {
        mataKuliah: mataKuliah,
        kelas: kelas,
        classTime: now.toISOString(),
        expiryTime: expiryTime.toISOString(),
        generatedAt: now.toISOString(),
        generatedBy: JSON.parse(localStorage.getItem('user')).username
    };
    
    // Convert to JSON string
    const qrString = JSON.stringify(qrData);
    
    // Generate QR code
    const qrCode = new QRCode(qrContainer, {
        text: qrString,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Show QR result container
    const qrResult = document.getElementById('qr-result');
    qrResult.style.display = 'flex';
    
    // Update info text
    const infoText = document.getElementById('qr-info-text');
    infoText.innerHTML = `
        <strong>Mata Kuliah:</strong> ${mataKuliah}<br>
        <strong>Kelas:</strong> ${kelas}<br>
        <strong>Waktu Mulai:</strong> ${formatDateTime(now)}<br>
        <strong>Berlaku Hingga:</strong> ${formatDateTime(expiryTime)}<br>
        <strong>Durasi:</strong> ${durasi} menit
    `;
    
    // Setup download button
    setupDownloadButton(qrContainer.querySelector('img').src, `QR_${mataKuliah}_${kelas}_${formatDateForFile(now)}`);
    
    // Setup print button
    setupPrintButton();
    
    // Save QR session to local storage
    saveQRSession(qrData);
}

// Format date and time for display
function formatDateTime(date) {
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format date for file naming
function formatDateForFile(date) {
    return date.toISOString().split('.')[0].replace(/:/g, '-').replace('T', '_');
}

// Setup download button functionality
function setupDownloadButton(imgSrc, filename) {
    const downloadBtn = document.getElementById('download-qr');
    
    downloadBtn.addEventListener('click', function() {
        const link = document.createElement('a');
        link.href = imgSrc;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Setup print button functionality
function setupPrintButton() {
    const printBtn = document.getElementById('print-qr');
    
    printBtn.addEventListener('click', function() {
        const qrImg = document.querySelector('#qr-container img').src;
        const infoText = document.getElementById('qr-info-text').innerHTML;
        
        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code Absensi</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                    }
                    .print-container {
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    .qr-image {
                        width: 300px;
                        height: 300px;
                        margin: 20px auto;
                    }
                    .info-text {
                        text-align: left;
                        line-height: 1.6;
                        margin-top: 20px;
                    }
                    h1 {
                        margin-bottom: 30px;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <h1>QR Code Absensi</h1>
                    <img class="qr-image" src="${qrImg}" alt="QR Code">
                    <div class="info-text">
                        ${infoText}
                    </div>
                    <button class="no-print" style="margin-top: 20px; padding: 10px 20px;" onclick="window.print()">Print</button>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    });
}

// Save QR session to local storage
function saveQRSession(qrData) {
    // Get existing QR sessions
    let qrSessions = JSON.parse(localStorage.getItem('qrSessions')) || [];
    
    // Add new session
    qrSessions.push(qrData);
    
    // Save back to local storage
    localStorage.setItem('qrSessions', JSON.stringify(qrSessions));
}