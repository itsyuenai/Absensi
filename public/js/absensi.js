// absensi.js - Handles QR scanning functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date and time display
    initializeClock();
    
    // Initialize QR Scanner
    initializeQRScanner();
});

// Initialize digital clock and date display
function initializeClock() {
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('date-display');
    
    function updateClock() {
        const now = new Date();
        
        // Update time
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
        
        // Update date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('id-ID', options);
    }
    
    // Update clock immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);
}

// Initialize QR Scanner
function initializeQRScanner() {
    const scannerContainer = document.getElementById('qr-reader');
    const resultContainer = document.getElementById('scan-result');
    
    // Create config object
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
    };
    
    // Create scanner instance
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    // Start camera scanning
    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess, 
        onScanFailure
    );
    
    // Success callback
    function onScanSuccess(decodedText, decodedResult) {
        try {
            // Parse the QR code data
            const qrData = JSON.parse(decodedText);
            
            // Stop scanning temporarily
            html5QrCode.pause();
            
            // Process attendance
            processAttendance(qrData);
            
            // Resume scanning after 3 seconds
            setTimeout(() => {
                html5QrCode.resume();
                resultContainer.innerHTML = 'Menunggu QR Code...';
            }, 3000);
            
        } catch (error) {
            resultContainer.innerHTML = `<span style="color: red">QR Code tidak valid!</span>`;
            
            // Resume scanning after 2 seconds
            setTimeout(() => {
                html5QrCode.resume();
                resultContainer.innerHTML = 'Menunggu QR Code...';
            }, 2000);
        }
    }
    
    // Error callback
    function onScanFailure(error) {
        // Handle scan failure silently
        console.warn(`QR code scanning failed: ${error}`);
    }
    
    // Initial message
    resultContainer.innerHTML = 'Menunggu QR Code...';
}

// Process attendance from QR data
function processAttendance(qrData) {
    const resultContainer = document.getElementById('scan-result');
    const currentTime = new Date();
    
    // Check if QR is expired
    const expiryTime = new Date(qrData.expiryTime);
    if (currentTime > expiryTime) {
        resultContainer.innerHTML = `<span style="color: red">QR Code sudah kadaluarsa!</span>`;
        return;
    }
    
    // Get user info
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        resultContainer.innerHTML = `<span style="color: red">Silahkan login terlebih dahulu!</span>`;
        return;
    }
    
    // Calculate if late or on time
    let status = 'hadir';
    const startTime = new Date(qrData.classTime);
    const lateThreshold = new Date(startTime.getTime() + 15 * 60000); // 15 minutes grace period
    
    if (currentTime > lateThreshold) {
        status = 'terlambat';
    }
    
    // Create attendance record
    const attendanceRecord = {
        userId: user.id,
        userName: user.name,
        mataKuliah: qrData.mataKuliah,
        kelas: qrData.kelas,
        tanggal: currentTime.toISOString().split('T')[0],
        waktuMasuk: currentTime.toLocaleTimeString('id-ID'),
        status: status
    };
    
    // Save attendance to local storage
    saveAttendance(attendanceRecord);
    
    // Show success message with attendance details
    resultContainer.innerHTML = `
        <span style="color: green">Presensi berhasil!</span><br>
        <strong>${qrData.mataKuliah}</strong> - ${qrData.kelas}<br>
        Status: <strong>${status === 'hadir' ? 'Hadir' : 'Terlambat'}</strong><br>
        Waktu: ${currentTime.toLocaleTimeString('id-ID')}
    `;
}

// Save attendance record to local storage
function saveAttendance(record) {
    // Get existing attendance records
    let attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];
    
    // Check if already attended this class today
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = attendanceRecords.find(a => 
        a.userId === record.userId && 
        a.mataKuliah === record.mataKuliah && 
        a.kelas === record.kelas &&
        a.tanggal === today
    );
    
    // If already attended, don't add new record
    if (existingRecord) {
        return;
    }
    
    // Add new record
    attendanceRecords.push(record);
    
    // Save back to local storage
    localStorage.setItem('attendance', JSON.stringify(attendanceRecords));
}