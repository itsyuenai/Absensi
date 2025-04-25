document.addEventListener('DOMContentLoaded', function() {
    // Initialize date and time display
    initializeClock();

    // Untuk tombol generate QR (jika di halaman admin)
    const generateButton = document.getElementById('generate-qr-btn');
    if (generateButton) {
        generateButton.addEventListener('click', requestQRCode);
    }
});

// GLOBAL: Jam Digital
function initializeClock() {
    const clockElement = document.getElementById("digital-clock");
    const dateElement = document.getElementById("date-display");

    function updateClock() {
        const now = new Date();
        const time = now.toLocaleTimeString('id-ID');
        const date = now.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        if (clockElement) clockElement.textContent = time;
        if (dateElement) dateElement.textContent = date;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// Fungsi dummy agar tidak error jika dipanggil dari HTML
function requestQRCode() {
    const resultContainer = document.getElementById('scan-result');
    resultContainer.innerHTML = '<span style="color: green">QR Code berhasil dibuat!</span>';
}
// INIT
document.addEventListener('DOMContentLoaded', () => {
    initializeClock();

    const isIndexPage = window.location.pathname.includes('index.html') ||
                        window.location.pathname.endsWith('/');
    
                        if (isIndexPage) {
                            if (typeof Html5Qrcode === 'undefined') {
                                // QR library belum tersedia, akan diload otomatis oleh initializeQRScanner
                                console.warn("QR lib belum siap, mencoba load otomatis...");
                            }
                            initializeQRScanner(); // ini akan handle load dinamis
                        }                        

    const generateButton = document.getElementById('generate-qr-btn');
    if (generateButton) {
        generateButton.addEventListener('click', requestQRCode);
    }
});

// Initialize QR Scanner function
function initializeQRScanner() {
    const scannerContainer = document.getElementById('qr-reader');
    const resultContainer = document.getElementById('scan-result');
    
    if (!scannerContainer || !resultContainer) {
        console.warn("QR scanner elements not found in the DOM");
        return;
    }
    
    // Check if Html5Qrcode is available
    if (typeof Html5Qrcode === 'undefined') {
        console.error("Html5Qrcode library not loaded");
        resultContainer.innerHTML = '<span style="color: red">QR scanner library not loaded!</span>';
        
        // Try to dynamically load the library as a fallback
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js";
        script.onload = function() {
            resultContainer.innerHTML = 'Library loaded, initializing scanner...';
            setTimeout(initializeQRScanner, 1000); // Try again after the library loads
        };
        script.onerror = function() {
            resultContainer.innerHTML = '<span style="color: red">Failed to load QR scanner library!</span>';
        };
        document.head.appendChild(script);
        return;
    }
    
    // Create config object
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
    };
    
    // Create scanner instance
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    // Start camera scanning automatically
    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess, 
        onScanFailure
    ).catch(err => {
        console.error("Failed to start scanner:", err);
        resultContainer.innerHTML = `<span style="color: red">Failed to start camera: ${err.message}</span>`;
    });
    
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
        // Handle scan failure silently (avoid console spam)
    }
    
    // Initial message
    resultContainer.innerHTML = 'Menunggu QR Code...';
}

// Process attendance from QR data and save to database
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
    
    // Calculate status based on reference time (07:30-07:45)
    // but allow attendance at any time
    let status = 'hadir';
    const currentDate = new Date().toISOString().split('T')[0];
    const startTime = new Date(`${currentDate}T07:30:00`);
    const lateThreshold = new Date(`${currentDate}T07:45:00`);
    
    if (currentTime > lateThreshold) {
        status = 'terlambat';
    } else if (currentTime < startTime) {
        status = 'lebih awal';
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
    
    // Save attendance to database through API
    saveAttendanceToDatabase(attendanceRecord);
    
    // Show temporary success message
    resultContainer.innerHTML = `
        <span style="color: green">Memproses absensi...</span>
    `;
}

// Save attendance record to database
function saveAttendanceToDatabase(record) {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
        document.getElementById('scan-result').innerHTML = `
            <span style="color: red">Tidak dapat menyimpan data: Token tidak ditemukan!</span>
        `;
        return;
    }
    
    // API call to save attendance
    fetch('/api/absensi/save-attendance', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Gagal menyimpan absensi');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Also save locally as backup
            saveAttendanceLocally(record);
            
            // Show success message with attendance details
            document.getElementById('scan-result').innerHTML = `
                <span style="color: green">Presensi berhasil!</span><br>
                <strong>${record.mataKuliah}</strong> - ${record.kelas}<br>
                Status: <strong>${record.status === 'hadir' ? 'Hadir' : record.status === 'terlambat' ? 'Terlambat' : 'Lebih Awal'}</strong><br>
                Waktu: ${record.waktuMasuk}
            `;
        } else {
            document.getElementById('scan-result').innerHTML = `
                <span style="color: red">Gagal menyimpan absensi: ${data.message || 'Unknown error'}</span>
            `;
        }
    })
    .catch(error => {
        console.error("Error saving attendance:", error);
        document.getElementById('scan-result').innerHTML = `
            <span style="color: red">Error: ${error.message}</span><br>
            <small>Data disimpan secara lokal sebagai cadangan.</small>
        `;
        
        // Save locally as backup in case of API failure
        saveAttendanceLocally(record);
    });
}

// Backup function to save attendance locally
function saveAttendanceLocally(record) {
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
