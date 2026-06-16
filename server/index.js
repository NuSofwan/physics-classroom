import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import classroomRoutes from './routes/classrooms.js';
import videoRoutes from './routes/videos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Trust reverse proxies (Render/Railway/Nginx) for correct protocol/IP.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/videos', videoRoutes);

// Unknown API routes must not fall through to the SPA handler (which would hang).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'ไม่พบ API ที่ร้องขอ' });
});

// Serve static frontend (production)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Connect to the database (if configured) before accepting traffic.
initDb()
  .catch((err) => {
    console.error('❌ Database init failed:', err.message);
    console.error('   Falling back to local JSON file storage.');
  })
  .finally(() => {
    app.listen(PORT, HOST, () => {
      console.log(`\n🎓 PhysicsClassroom Server running at http://localhost:${PORT}`);
      console.log(`🌐 On your network (open on phone): http://<your-computer-ip>:${PORT}`);
      console.log(`📚 Admin password: ${process.env.ADMIN_PASSWORD || 'physics2026'}`);
      console.log(`\nPress Ctrl+C to stop\n`);
    });
  });
