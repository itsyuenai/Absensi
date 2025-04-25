const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET || 'rahasiaabsensi123'; 

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, username, password, fakultas } = req.body;
    
    // Validation
    if (!name || !email || !username || !password || !fakultas) {
      return res.status(400).json({ 
        success: false, 
        message: "Semua kolom harus diisi!" 
      });
    }

    // Check for existing user
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ 
        success: false, 
        message: "Username sudah digunakan!" 
      });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: "Email sudah terdaftar!" 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      username,
      password: hashedPassword,
      fakultas
    });

    await newUser.save();
    
    res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil! Silakan login."
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Terjadi kesalahan server." 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt:", { username, password });

    if (!username || !password) {
      console.log("Validation failed: username/password kosong");
      return res.status(400).json({
        success: false,
        message: "Username dan password harus diisi!"
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log("User tidak ditemukan dengan username:", username);
      return res.status(400).json({
        success: false,
        message: "Username atau password salah!"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Username atau password salah!"
      });
    }

    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      fakultas: user.fakultas,
      role: user.role
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    console.log("Login berhasil untuk user:", user.username);

    res.json({
      success: true,
      message: "Login berhasil!",
      user: userData,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server."
    });
  }
};

// Logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: "Logout berhasil!"
  });
};

// Verify token - untuk middleware
exports.verifyToken = (req, res, next) => {
  // Cek token dari cookies atau headers
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak! Token tidak tersedia."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token tidak valid atau kadaluarsa."
    });
  }
};

// Get current user - ensure all fields are included
exports.getCurrentUser = async (req, res) => {
  try {
    // Find the user by ID with all required fields
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    
    console.log("Returning user data:", user);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        fakultas: user.fakultas,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};

// Reset password request
exports.resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email harus diisi!" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Email tidak terdaftar!" 
      });
    }

    // In a real application, you would send an email with a reset link/token
    // For this demo, we'll just return a success message
    
    res.json({ 
      success: true, 
      message: "Instruksi reset password telah dikirim ke email Anda." 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Terjadi kesalahan server." 
    });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    // Periksa apakah user adalah admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak! Hanya admin yang dapat mengakses data ini."
      });
    }
    
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Terjadi kesalahan server." 
    });
  }
};