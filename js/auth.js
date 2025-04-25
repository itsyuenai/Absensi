// auth.js - Fixed to properly handle user data and CORS issues

// Check if user is logged in
async function checkAuth() {
    try {
        // Get user data from server using cookie
        const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/me', {
            method: 'GET',
            credentials: 'include', // Important to send cookies
            headers: {
                'Content-Type': 'application/json'
                // Remove incorrect CORS headers - these should be set server-side
            }
        });

        // Handle response status
        if (!response.ok) {
            console.warn('Auth check failed:', response.status);
            // If not authenticated and not on login/register page
            if (!window.location.href.includes('login.html') && 
                !window.location.href.includes('register.html') && 
                !window.location.href.includes('reset-password.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        // If authenticated
        const data = await response.json();
        console.log('User data received:', data);
        
        if (data && data.success && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        } else {
            console.error('Invalid user data format received:', data);
            localStorage.removeItem('user'); // Clear invalid data
        }
        
        // If on auth page but already logged in, redirect to index
        if (window.location.href.includes('login.html') || 
            window.location.href.includes('register.html') || 
            window.location.href.includes('reset-password.html')) {
            window.location.href = 'index.html';
        }

        // Update user info in sidebar
        updateUserInfo();
        
        // Handle admin menu visibility
        handleAdminMenu();
        
        // Initialize date and time if elements exist
        initDateTime();
        
    } catch (error) {
        console.error('Auth check error:', error);
        // If error and not on login/register page, redirect to login
        if (!window.location.href.includes('login.html') && 
            !window.location.href.includes('register.html') && 
            !window.location.href.includes('reset-password.html')) {
            window.location.href = 'login.html';
        }
    }
}

function updateUserInfo() {
    const userInfoElement = document.getElementById('user-info');
    if (!userInfoElement) {
        console.warn('User info element not found in DOM');
        return;
    }
    
    try {
        // Try to get user from localStorage first
        const userJson = localStorage.getItem('user');
        
        if (!userJson) {
            // If no user in localStorage, try to parse from JWT token
            const token = document.cookie.split('; ').find(row => row.startsWith('token='));
            if (token) {
                const tokenValue = token.split('=')[1];
                // Parse JWT payload (middle part of token)
                const base64Url = tokenValue.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                
                if (payload.userId) {
                    // If we have userId in token, fetch user data from server
                    fetch('http://localhost:3000/api/auth/me', {
                        credentials: 'include'
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.user) {
                            localStorage.setItem('user', JSON.stringify(data.user));
                            displayUserInfo(data.user);
                        }
                    })
                    .catch(err => console.error('Error fetching user data:', err));
                    return;
                }
            }
            
            userInfoElement.innerHTML = `
                <p><strong>Not logged in</strong></p>
                <p>Please log in</p>
            `;
            return;
        }
        
        const user = JSON.parse(userJson);
        displayUserInfo(user);
        
    } catch (error) {
        console.error('Error updating user info:', error);
        userInfoElement.innerHTML = `
            <p><strong>Error</strong></p>
            <p>Could not load user data</p>
        `;
    }
    
    function displayUserInfo(user) {
        userInfoElement.innerHTML = `
            <div class="user-profile">
                <p><strong>${user.name || user.username || 'Unknown User'}</strong></p>
                <p>${user.email || 'No email available'}</p>
                <p>${user.fakultas || 'No Faculty'}</p>
            </div>
        `;
    }
}

// Register form handler
function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value; 
            const username = document.getElementById('username').value;
            const fakultas = document.getElementById('fakultas').value;
            const password = document.getElementById('password').value;
            const messageElement = document.getElementById('reg-message');
            
            if (!name || !email || !username || !fakultas || !password) {
                messageElement.textContent = 'Semua field harus diisi!';
                messageElement.className = 'message-error';
                return;
            }

            try {
                messageElement.textContent = 'Membuat akun...';
                
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, username, password, fakultas })
                });

                const data = await response.json();
                
                if (response.ok && data.success) {
                    messageElement.textContent = data.message || 'Pendaftaran berhasil! Silakan login.';
                    messageElement.className = 'message-success';
                    // Redirect to login page after 2 seconds
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    messageElement.textContent = data.message || 'Pendaftaran gagal.';
                    messageElement.className = 'message-error';
                }
            } catch (error) {
                console.error('Register Error:', error);
                messageElement.textContent = 'Error saat mendaftar. Cek apakah server sedang berjalan.';
                messageElement.className = 'message-error';
            }
        });
    }
}

// Initialize date and time display
function initDateTime() {
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('date-display');
    
    if (clockElement && dateElement) {
        // Update clock immediately
        updateDateTime();
        
        // Then update clock every second
        setInterval(updateDateTime, 1000);
    }
}

function updateDateTime() {
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('date-display');
    
    if (!clockElement || !dateElement) return;
    
    const now = new Date();
    
    // Format time as HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    
    // Format date as Weekday, DD Month YYYY
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('id-ID', options);
}

// Handle admin menu visibility
function handleAdminMenu() {
    const adminMenu = document.getElementById('admin-menu');
    if (!adminMenu) return;
    
    try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
            adminMenu.style.display = 'none';
            return;
        }
        
        const user = JSON.parse(userJson);
        if (user && user.role === 'admin') {
            adminMenu.style.display = 'block';
        } else {
            adminMenu.style.display = 'none';
        }
    } catch (error) {
        console.error('Error handling admin menu:', error);
        adminMenu.style.display = 'none';
    }
}

// Handle logout
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                // Call logout API to remove cookie
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                        // Remove incorrect CORS headers
                    }
                });
                
                // Clear localStorage
                localStorage.removeItem('user');
                
                // Redirect to login
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                // Still redirect to login even if error
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        });
    }
}

// Login form handler - with improved error handling
// Login form handler with improved user data handling
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            
            if (!username || !password) {
                errorMessage.textContent = 'Username dan password harus diisi!';
                return;
            }

            try {
                errorMessage.textContent = 'Logging in...'; // Feedback during login process
                
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include', // Important to receive cookies
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                console.log("Login API complete response:", data);

                if (response.ok && data.success) {
                    if (data.user && data.user.name && data.user.email) {
                        console.log("Storing user data:", data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        window.location.href = 'index.html';
                    } else {
                        console.error("Incomplete user data received:", data.user);
                        errorMessage.textContent = 'Incomplete user data received. Contact administrator.';
                    }
                } else {
                    errorMessage.textContent = data.message || 'Login failed.';
                }
            } catch (error) {
                console.error('Login Error:', error);
                errorMessage.textContent = 'Error during login. Please check if the server is running.';
            }
        });
    }
}

// Initialize auth components
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing auth components');
    checkAuth();
    setupLogoutButton();
    setupLoginForm();
    
    // For register and reset forms, keep the original implementations
    if (typeof setupRegisterForm === 'function') setupRegisterForm();
    if (typeof setupResetPasswordForm === 'function') setupResetPasswordForm();
});
