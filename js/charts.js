// charts.js - Handles statistics and chart visualization

document.addEventListener('DOMContentLoaded', function() {
    // Initialize year filter with options
    initializeYearFilter();
    
    // Initialize month filter (setting current month as default)
    initializeMonthFilter();
    
    // Apply default filters and load stats
    loadStatistics();
    
    // Setup filter application button
    setupFilterButton();
    
    // Setup refresh/reset button
    setupResetButton();
});

// Initialize year filter with options
function initializeYearFilter() {
    const yearFilter = document.getElementById('filter-tahun');
    const currentYear = new Date().getFullYear();
    
    // Add the last 5 years as options
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    }
    
    // Set current year as default
    yearFilter.value = currentYear;
}

// Initialize month filter with current month as default
function initializeMonthFilter() {
    const monthFilter = document.getElementById('filter-bulan');
    const currentMonth = (new Date().getMonth() + 1).toString();
    
    if (monthFilter) {
        monthFilter.value = currentMonth;
    }
}

// Setup filter application button
function setupFilterButton() {
    const applyFilterBtn = document.getElementById('apply-filter');
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function() {
            loadStatistics();
        });
    } else {
        console.error("Filter button not found");
    }
}

// Setup reset button to clear filters
function setupResetButton() {
    const resetBtn = document.getElementById('reset-filter');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            document.getElementById('filter-bulan').value = 'all';
            initializeYearFilter(); // Reset year to current year
            loadStatistics();
        });
    }
}

// Load statistics with applied filters
function loadStatistics() {
    const monthFilter = document.getElementById('filter-bulan').value;
    const yearFilter = document.getElementById('filter-tahun').value;
    
    // Show loading state
    showLoadingState(true);
    
    try {
        // Get user data
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            showError("User data not found. Please login again.");
            return;
        }
        
        // Get attendance data
        let attendanceData = JSON.parse(localStorage.getItem('attendance')) || [];
        
        // Filter by user if not admin
        if (user.role !== 'admin') {
            attendanceData = attendanceData.filter(item => item.userId === user.id);
        }
        
        // Apply year filter
        attendanceData = attendanceData.filter(item => {
            const itemDate = new Date(item.tanggal);
            return itemDate.getFullYear().toString() === yearFilter;
        });
        
        // Apply month filter if not "all"
        if (monthFilter !== 'all') {
            attendanceData = attendanceData.filter(item => {
                const itemDate = new Date(item.tanggal);
                return (itemDate.getMonth() + 1).toString() === monthFilter;
            });
        }
        
        // Generate statistics
        const stats = generateStatistics(attendanceData);
        
        // Render charts
        renderSubjectChart(stats.subjectData);
        renderDailyChart(stats.dailyData);
        renderStatusChart(stats.statusData);
        
        // Update summary stats
        updateSummaryStats(stats);
        
        // Show no data message if needed
        toggleNoDataMessage(attendanceData.length === 0);
        
    } catch (error) {
        console.error("Error loading statistics:", error);
        showError("Failed to load attendance data");
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
}

// Toggle loading state
function showLoadingState(isLoading) {
    const chartContainers = document.querySelectorAll('.chart-container');
    const loadingElements = document.querySelectorAll('.loading-indicator');
    
    chartContainers.forEach(container => {
        container.style.opacity = isLoading ? '0.5' : '1';
    });
    
    loadingElements.forEach(element => {
        element.style.display = isLoading ? 'block' : 'none';
    });
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
    }
}

// Toggle no data message
function toggleNoDataMessage(show) {
    const noDataElements = document.querySelectorAll('.no-data-message');
    const chartElements = document.querySelectorAll('.chart-container canvas');
    
    noDataElements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });
    
    chartElements.forEach(element => {
        element.style.display = show ? 'none' : 'block';
    });
}

// Generate statistics from attendance data
function generateStatistics(attendanceData) {
    // Initialize stats object
    const stats = {
        total: attendanceData.length,
        onTime: 0,
        late: 0,
        subjectData: {},
        dailyData: {},
        statusData: {
            hadir: 0,
            terlambat: 0,
            tidak_hadir: 0
        }
    };
    
    // Process each attendance record
    attendanceData.forEach(record => {
        // Count by status
        if (record.status === 'hadir') {
            stats.onTime++;
            stats.statusData.hadir++;
        } else if (record.status === 'terlambat') {
            stats.late++;
            stats.statusData.terlambat++;
        } else if (record.status === 'tidak_hadir') {
            stats.statusData.tidak_hadir++;
        }
        
        // Group by subject
        if (!stats.subjectData[record.mataKuliah]) {
            stats.subjectData[record.mataKuliah] = 0;
        }
        stats.subjectData[record.mataKuliah]++;
        
        // Group by date
        const dateKey = record.tanggal;
        if (!stats.dailyData[dateKey]) {
            stats.dailyData[dateKey] = 0;
        }
        stats.dailyData[dateKey]++;
    });
    
    return stats;
}

// Render chart for attendance by subject
function renderSubjectChart(subjectData) {
    const ctx = document.getElementById('chart-mata-kuliah');
    if (!ctx) {
        console.error("Subject chart canvas not found");
        return;
    }
    
    // Prepare data
    const labels = Object.keys(subjectData);
    const data = Object.values(subjectData);
    
    // Generate colors
    const backgroundColors = generateColors(labels.length);
    
    // Destroy existing chart if it exists
    if (window.subjectChart) {
        window.subjectChart.destroy();
    }
    
    // Create new chart
    if (labels.length > 0) {
        window.subjectChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'Kehadiran per Mata Kuliah'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Render chart for daily attendance
function renderDailyChart(dailyData) {
    const ctx = document.getElementById('chart-harian');
    if (!ctx) {
        console.error("Daily chart canvas not found");
        return;
    }
    
    // Prepare data - sort by date
    const sortedDates = Object.keys(dailyData).sort();
    const values = sortedDates.map(date => dailyData[date]);
    
    // Format dates for display
    const formattedDates = sortedDates.map(date => {
        const parts = date.split('-');
        return `${parts[2]}/${parts[1]}`;
    });
    
    // Destroy existing chart if it exists
    if (window.dailyChart) {
        window.dailyChart.destroy();
    }
    
    // Create new chart
    if (sortedDates.length > 0) {
        window.dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [{
                    label: 'Jumlah Kehadiran',
                    data: values,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Kehadiran Harian'
                    }
                }
            }
        });
    }
}

// Render chart for attendance status
function renderStatusChart(statusData) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) {
        console.error("Status chart canvas not found");
        return;
    }
    
    // Prepare data
    const labels = ['Hadir', 'Terlambat', 'Tidak Hadir'];
    const data = [statusData.hadir, statusData.terlambat, statusData.tidak_hadir];
    
    // Define colors
    const backgroundColors = [
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(255, 99, 132, 0.7)'
    ];
    
    // Destroy existing chart if it exists
    if (window.statusChart) {
        window.statusChart.destroy();
    }
    
    // Create new chart
    window.statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Status Kehadiran'
                }
            }
        }
    });
}

// Update summary statistics display
function updateSummaryStats(stats) {
    const totalElement = document.getElementById('total-kehadiran');
    const onTimeElement = document.getElementById('tepat-waktu');
    const lateElement = document.getElementById('terlambat');
    const rateElement = document.getElementById('tingkat-kehadiran');
    
    if (totalElement) totalElement.textContent = stats.total;
    if (onTimeElement) onTimeElement.textContent = stats.onTime;
    if (lateElement) lateElement.textContent = stats.late;
    
    // Calculate attendance rate based on total scheduled classes
    const attendanceData = JSON.parse(localStorage.getItem('attendance')) || [];
    const scheduledClasses = JSON.parse(localStorage.getItem('scheduledClasses')) || [];
    
    // If we have scheduled classes data, use that for calculation
    // Otherwise fallback to a minimum of 10 classes or actual attendance count
    const totalClasses = scheduledClasses.length > 0 ? 
                          scheduledClasses.length : 
                          Math.max(stats.total, 10);
    
    const attendanceRate = ((stats.onTime + stats.late) / totalClasses * 100).toFixed(1);
    
    if (rateElement) rateElement.textContent = `${attendanceRate}%`;
    
    // Update rate color based on value
    if (rateElement) {
        if (parseFloat(attendanceRate) >= 80) {
            rateElement.className = 'text-success';
        } else if (parseFloat(attendanceRate) >= 60) {
            rateElement.className = 'text-warning';
        } else {
            rateElement.className = 'text-danger';
        }
    }
    
    // Update additional stats if available
    updateAdditionalStats(stats, attendanceData);
}

// Update additional statistics if UI elements exist
function updateAdditionalStats(stats, attendanceData) {
    // Calculate average arrival time if we have attendance with time data
    const arrivals = attendanceData.filter(item => 
        item.waktuDatang && (item.status === 'hadir' || item.status === 'terlambat')
    );
    
    if (arrivals.length > 0) {
        const avgElement = document.getElementById('rata-rata-kedatangan');
        if (avgElement) {
            // Convert arrival times to minutes since midnight
            const arrivalTimes = arrivals.map(item => {
                const [hours, minutes] = item.waktuDatang.split(':').map(Number);
                return hours * 60 + minutes;
            });
            
            // Calculate average
            const avgMinutes = arrivalTimes.reduce((sum, time) => sum + time, 0) / arrivalTimes.length;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = Math.floor(avgMinutes % 60);
            
            // Format for display (ensuring 2 digits)
            const formattedTime = `${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`;
            avgElement.textContent = formattedTime;
        }
    }
}

// Generate consistent colors for charts
function generateColors(count) {
    const baseColors = [
        'rgba(54, 162, 235, 0.7)',   // Blue
        'rgba(75, 192, 192, 0.7)',   // Green
        'rgba(255, 206, 86, 0.7)',   // Yellow
        'rgba(255, 99, 132, 0.7)',   // Red
        'rgba(153, 102, 255, 0.7)',  // Purple
        'rgba(255, 159, 64, 0.7)',   // Orange
        'rgba(199, 199, 199, 0.7)',  // Gray
        'rgba(83, 102, 255, 0.7)',   // Indigo
        'rgba(78, 205, 196, 0.7)',   // Teal
        'rgba(255, 177, 193, 0.7)'   // Pink
    ];
    
    const colors = [];
    
    // If we need more colors than available in baseColors, generate them
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    } else {
        // Use base colors first
        colors.push(...baseColors);
        
        // Generate additional colors
        for (let i = baseColors.length; i < count; i++) {
            // Generate random but visually distinct colors
            const h = (i * 137.5) % 360; // Use golden angle approximation for distribution
            const s = 70 + Math.random() * 10; // High saturation for vibrant colors
            const l = 50 + Math.random() * 10; // Medium lightness for visibility
            
            colors.push(`hsla(${h}, ${s}%, ${l}%, 0.7)`);
        }
        
        return colors;
    }
}

// Export data functionality
function exportToCSV() {
    const monthFilter = document.getElementById('filter-bulan').value;
    const yearFilter = document.getElementById('filter-tahun').value;
    
    // Get attendance data with filters applied
    let attendanceData = JSON.parse(localStorage.getItem('attendance')) || [];
    
    // Apply user filter if not admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role !== 'admin') {
        attendanceData = attendanceData.filter(item => item.userId === user.id);
    }
    
    // Apply year filter
    attendanceData = attendanceData.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate.getFullYear().toString() === yearFilter;
    });
    
    // Apply month filter if not "all"
    if (monthFilter !== 'all') {
        attendanceData = attendanceData.filter(item => {
            const itemDate = new Date(item.tanggal);
            return (itemDate.getMonth() + 1).toString() === monthFilter;
        });
    }
    
    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add header row
    csvContent += "Tanggal,Mata Kuliah,Status,Waktu Datang,Catatan\n";
    
    // Add data rows
    attendanceData.forEach(item => {
        const row = [
            item.tanggal,
            item.mataKuliah,
            item.status,
            item.waktuDatang || '-',
            item.catatan || '-'
        ];
        
        // Escape any commas in the data
        const escapedRow = row.map(field => {
            // If field contains comma, quote, or newline, enclose in quotes
            if (/[",\n]/.test(field)) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        });
        
        csvContent += escapedRow.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${yearFilter}_${monthFilter}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Setup export button if it exists
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
});