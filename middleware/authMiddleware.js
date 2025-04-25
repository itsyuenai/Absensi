const jwt = require('jsonwebtoken');

// Secret key untuk JWT (idealnya simpan di .env)
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware untuk verifikasi token
const authMiddleware = (req, res, next) => {
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

module.exports = { authMiddleware };
