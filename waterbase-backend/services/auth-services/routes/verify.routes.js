const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();

// GET /verify - Verify token from Authorization header
router.get('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const appId = req.headers['x-app-id'];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Return user info
    res.json({ 
      valid: true, 
      user: decoded,
      appId: appId || decoded.appId 
    });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token', error: error.message });
  }
});

// POST /verify-token - Verify token from body (for backward compatibility)
router.post('/verify-token', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false, message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

module.exports = router;
