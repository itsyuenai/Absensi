// auth.js - Handles authentication functionality

// Check if user is logged in
async function checkAuth() {
    try {
        // Coba dapatkan data user dari server menggunakan cookie
        const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/me', {
            method: 'GET',
            credentials: 'include', // Penting untuk mengirim cookies
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Jika tidak terautentikasi dan bukan di halaman login/register
            if (!window.location.href.includes('login.html') && 
                !window.location.href.includes('register.html') && 
                !window.location.href.includes('reset-password.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        // Jika terautentikasi
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Jika di halaman auth tapi sudah login, redirect ke index
        if (window.location.href.includes('login.html') || 
            window.location.href.includes('register.html') || 
            window.location.href.includes('reset-password.html')) {
            window.location.href = 'index.html';
        }

        // Update user info in sidebar
        updateUserInfo();
        
        // Handle admin menu visibility
        handleAdminMenu();
        
    } catch (error) {
        console.error('Auth check error:', error);
        // Jika error dan bukan di halaman login/register, redirect ke login
        if (!window.location.href.includes('login.html') && 
            !window.location.href.includes('register.html') && 
            !window.location.href.includes('reset-password.html')) {
            window.location.href = 'login.html';
        }
    }
}

// Update user info in sidebar
function updateUserInfo() {
    const userInfoElement = document.getElementById('user-info');
    if (!userInfoElement) return;
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        userInfoElement.innerHTML = `
            <p><strong>${user.name}</strong></p>
            <p>${user.email}</p>
            <p>${user.fakultas}</p>
        `;
    }
}

// Handle admin menu visibility
function handleAdminMenu() {
    const adminMenu = document.getElementById('admin-menu');
    if (!adminMenu) return;
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'admin') {
        adminMenu.style.display = 'block';
    }
}

// Handle logout
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                // Panggil API logout untuk menghapus cookie
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                // Bersihkan localStorage
                localStorage.removeItem('user');
                
                // Redirect ke login
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                // Tetap redirect ke login walaupun error
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        });
    }
}

// Login form handler
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');

            try {
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include', // Penting untuk menerima cookies
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    errorMessage.textContent = data.message || 'Login gagal.';
                }
            } catch (error) {
                console.error('Login Error:', error);
                errorMessage.textContent = 'Terjadi kesalahan saat login.';
            }
        });
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
            const message = document.getElementById('reg-message');

            try {
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, username, fakultas, password })
                });

                const data = await response.json();
                if (response.ok) {
                    message.textContent = 'Pendaftaran berhasil! Silahkan login.';
                    message.className = 'message-success';
                    
                    registerForm.reset();
                    
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    message.textContent = data.message || 'Pendaftaran gagal.';
                    message.className = 'message-error';
                }
            } catch (error) {
                console.error('Register Error:', error);
                message.textContent = 'Terjadi kesalahan saat mendaftar.';
                message.className = 'message-error';
            }
        });
    }
}

// Reset password form handler
function setupResetPasswordForm() {
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const message = document.getElementById('reset-message');
            
            try {
                const response = await fetch('https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app/api/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    message.textContent = 'Link reset password telah dikirim ke email Anda.';
                    message.className = 'message-info';
                    resetForm.reset();
                } else {
                    message.textContent = data.message || 'Gagal mengirim permintaan reset password.';
                    message.className = 'message-error';
                }
            } catch (error) {
                console.error('Reset password error:', error);
                message.textContent = 'Terjadi kesalahan saat memproses permintaan.';
                message.className = 'message-error';
            }
        });
    }
}

// Initialize auth components
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupLogoutButton();
    setupLoginForm();
    setupRegisterForm();
    setupResetPasswordForm();
});
