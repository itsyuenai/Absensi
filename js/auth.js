const BASE_URL = 'https://inclined-ddene-itsyuenai-ccb1f6ab.koyeb.app'; // Change this if you want to use localhost

// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('Auth check failed:', response.status);
            if (!window.location.href.includes('login.html') &&
                !window.location.href.includes('register.html') &&
                !window.location.href.includes('reset-password.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        const data = await response.json();
        console.log('User data received:', data);

        if (data && data.success && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        } else {
            console.error('Invalid user data format received:', data);
            localStorage.removeItem('user');
        }

        if (window.location.href.includes('login.html') ||
            window.location.href.includes('register.html') ||
            window.location.href.includes('reset-password.html')) {
            window.location.href = 'index.html';
        }

        updateUserInfo();
        handleAdminMenu();
        initDateTime();

    } catch (error) {
        console.error('Auth check error:', error);
        if (!window.location.href.includes('login.html') &&
            !window.location.href.includes('register.html') &&
            !window.location.href.includes('reset-password.html')) {
            window.location.href = 'login.html';
        }
    }
}

function updateUserInfo() {
    const userInfoElement = document.getElementById('user-info');
    if (!userInfoElement) return;

    try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
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

                const response = await fetch(`${BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, username, password, fakultas })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    messageElement.textContent = data.message || 'Pendaftaran berhasil!';
                    messageElement.className = 'message-success';
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    messageElement.textContent = data.message || 'Pendaftaran gagal.';
                    messageElement.className = 'message-error';
                }
            } catch (error) {
                console.error('Register Error:', error);
                messageElement.textContent = 'Error saat mendaftar. Pastikan server berjalan.';
                messageElement.className = 'message-error';
            }
        });
    }
}

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
                errorMessage.textContent = 'Logging in...';

                const response = await fetch(`${BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                console.log('Login API response:', data);

                if (response.ok && data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    errorMessage.textContent = data.message || 'Login gagal.';
                }
            } catch (error) {
                console.error('Login Error:', error);
                errorMessage.textContent = 'Error saat login. Pastikan server berjalan.';
            }
        });
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            try {
                await fetch(`${BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        });
    }
}

function initDateTime() {
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('date-display');

    if (clockElement && dateElement) {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }
}

function updateDateTime() {
    const now = new Date();
    const clockElement = document.getElementById('digital-clock');
    const dateElement = document.getElementById('date-display');

    if (!clockElement || !dateElement) return;

    clockElement.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    dateElement.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function handleAdminMenu() {
    const adminMenu = document.getElementById('admin-menu');
    if (!adminMenu) return;

    try {
        const userJson = localStorage.getItem('user');
        const user = JSON.parse(userJson);

        adminMenu.style.display = (user && user.role === 'admin') ? 'block' : 'none';
    } catch (error) {
        console.error('Error handling admin menu:', error);
        adminMenu.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing auth components');
    checkAuth();
    setupLogoutButton();
    setupLoginForm();
    if (typeof setupRegisterForm === 'function') setupRegisterForm();
    if (typeof setupResetPasswordForm === 'function') setupResetPasswordForm();
});
