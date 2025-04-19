// dashboard.js - Handles attendance listing and filtering functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date inputs with default values
    initializeDateFilters();
    
    // Load attendance data
    loadAttendanceData();
    
    // Setup filter button
    setupFilterButton();
    
    // Setup export buttons
    setupExportButtons();
    
    // Initialize subject filter options
    initializeSubjectFilter();
});

// Initialize date inputs with defaults
function initializeDateFilters() {
    const dateStart = document.getElementById('date-start');
    const dateEnd = document.getElementById('date-end');
    
    // Set default start date to 30 days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    dateStart.value = startDate.toISOString().split('T')[0];
    
    // Set default end date to today
    const endDate = new Date();
    dateEnd.value = endDate.toISOString().split('T')[0];
}

// Initialize subject filter options
function initializeSubjectFilter() {
    const matkulFilter = document.getElementById('matkul-filter');
    const attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];
    
    // Extract unique subjects
    const subjects = [...new Set(attendanceRecords.map(record => record.mataKuliah))];
    
    // Add options to select
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        matkulFilter.appendChild(option);
    });
}

// Setup filter button click event
function setupFilterButton() {
    const filterBtn = document.getElementById('filter-btn');
    
    filterBtn.addEventListener('click', function() {
        loadAttendanceData();
    });
}

// Load attendance data with filters
function loadAttendanceData(page = 1) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // Get filter values
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    const statusFilter = document.getElementById('status-filter').value;
    const matkulFilter = document.getElementById('matkul-filter').value;
    
    // Get all attendance records
    let attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];
    
    // Filter by user ID if not admin
    if (user.role !== 'admin') {
        attendanceRecords = attendanceRecords.filter(record => record.userId === user.id);
    }
    
    // Apply date filter
    attendanceRecords = attendanceRecords.filter(record => {
        return record.tanggal >= dateStart && record.tanggal <= dateEnd;
    });
    
    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
        attendanceRecords = attendanceRecords.filter(record => record.status === statusFilter);
    }
    
    // Apply subject filter if not 'all'
    if (matkulFilter !== 'all') {
        attendanceRecords = attendanceRecords.filter(record => record.mataKuliah === matkulFilter);
    }
    
    // Sort by date (newest first)
    attendanceRecords.sort((a, b) => {
        if (a.tanggal === b.tanggal) {
            return a.waktuMasuk < b.waktuMasuk ? 1 : -1;
        }
        return a.tanggal < b.tanggal ? 1 : -1;
    });
    
    // Pagination
    const itemsPerPage = 10;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = attendanceRecords.slice(startIndex, endIndex);
    const totalPages = Math.ceil(attendanceRecords.length / itemsPerPage);
    
    // Render data
    renderAttendanceData(paginatedRecords);
    
    // Render pagination
    renderPagination(page, totalPages);
}

// Render attendance data to table
function renderAttendanceData(records) {
    const tableBody = document.getElementById('absensi-data');
    
    // Clear existing data
    tableBody.innerHTML = '';
    
    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">Tidak ada data absensi</td>
            </tr>
        `;
        return;
    }
    
    // Add data rows
    records.forEach((record, index) => {
        const row = document.createElement('tr');
        
        // Format date
        const dateParts = record.tanggal.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formattedDate}</td>
            <td>${record.mataKuliah}</td>
            <td>${record.kelas}</td>
            <td>${record.waktuMasuk}</td>
            <td><span class="${getStatusClass(record.status)}">${getStatusText(record.status)}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Get CSS class for status
function getStatusClass(status) {
    switch(status) {
        case 'hadir': return 'badge-success';
        case 'terlambat': return 'badge-warning';
        case 'tidak_hadir': return 'badge-danger';
        default: return '';
    }
}

// Get display text for status
function getStatusText(status) {
    switch(status) {
        case 'hadir': return 'Hadir';
        case 'terlambat': return 'Terlambat';
        case 'tidak_hadir': return 'Tidak Hadir';
        default: return status;
    }
}

// Render pagination controls
function renderPagination(currentPage, totalPages) {
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = '«';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) loadAttendanceData(currentPage - 1);
    });
    paginationElement.appendChild(prevButton);
    
    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => loadAttendanceData(i));
        paginationElement.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = '»';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) loadAttendanceData(currentPage + 1);
    });
    paginationElement.appendChild(nextButton);
}

// Setup export buttons
function setupExportButtons() {
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportExcelBtn = document.getElementById('export-excel');
    
    exportPdfBtn.addEventListener('click', function() {
        alert('Export PDF functionality would be implemented here');
        // In a real implementation, this would generate a PDF using a library like jsPDF
    });
    
    exportExcelBtn.addEventListener('click', function() {
        alert('Export Excel functionality would be implemented here');
        // In a real implementation, this would generate an Excel file using a library like ExcelJS
    });
}