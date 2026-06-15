import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import classroomRoutes from './routes/classrooms.js';
import videoRoutes from './routes/videos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/videos', videoRoutes);

// Serve static frontend (production)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n🎓 PhysicsClassroom Server running at http://localhost:${PORT}`);
  console.log(`📚 Admin password: ${process.env.ADMIN_PASSWORD || 'physics2026'}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
