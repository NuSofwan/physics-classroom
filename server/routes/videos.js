import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { requireAdmin } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Get videos for a classroom (admin)
router.get('/classroom/:classroomId', requireAdmin, (req, res) => {
  const { classroomId } = req.params;

  const classroom = db.getClassroomById(classroomId);
  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  const videos = db.getVideosByClassroom(classroomId);
  res.json({ classroom, videos });
});

// Add video to classroom (admin)
router.post('/classroom/:classroomId', requireAdmin, (req, res) => {
  const { classroomId } = req.params;
  const { title, description, google_drive_file_id, duration } = req.body;

  if (!title || !google_drive_file_id) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อวีดีโอและ Google Drive File ID' });
  }

  const classroom = db.getClassroomById(classroomId);
  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  const orderIndex = db.getMaxVideoOrder(classroomId) + 1;

  const video = {
    id: uuidv4(),
    classroom_id: classroomId,
    title: title.trim(),
    description: description || '',
    google_drive_file_id: google_drive_file_id.trim(),
    thumbnail_url: `https://drive.google.com/thumbnail?id=${google_drive_file_id.trim()}&sz=w640`,
    duration: duration || '',
    order_index: orderIndex,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.createVideo(video);
  res.status(201).json({ video });
});

// Update video (admin)
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, description, google_drive_file_id, duration, order_index } = req.body;

  const existing = db.getVideoById(id);
  if (!existing) {
    return res.status(404).json({ error: 'ไม่พบวีดีโอนี้' });
  }

  const newFileId = google_drive_file_id || existing.google_drive_file_id;

  const updated = db.updateVideo(id, {
    title: title || existing.title,
    description: description !== undefined ? description : existing.description,
    google_drive_file_id: newFileId,
    thumbnail_url: `https://drive.google.com/thumbnail?id=${newFileId}&sz=w640`,
    duration: duration || existing.duration,
    order_index: order_index !== undefined ? order_index : existing.order_index,
  });

  res.json({ video: updated });
});

// Delete video (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  const existing = db.getVideoById(id);
  if (!existing) {
    return res.status(404).json({ error: 'ไม่พบวีดีโอนี้' });
  }

  db.deleteVideo(id);
  res.json({ message: 'ลบวีดีโอเรียบร้อยแล้ว' });
});

// Stream video from Google Drive (proxy) - accessible by students with valid classroom code
router.get('/:id/stream', async (req, res) => {
  const { id } = req.params;
  const { code } = req.query;

  const video = db.getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'ไม่พบวีดีโอนี้' });
  }

  // Get the classroom to validate code
  const classroom = db.getClassroomById(video.classroom_id);
  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  // Validate classroom code for student access
  if (code && classroom.code !== code.toUpperCase()) {
    return res.status(403).json({ error: 'รหัสกลุ่มไม่ถูกต้อง' });
  }

  try {
    // Use Google Drive direct download URL
    const driveUrl = `https://drive.google.com/uc?export=download&id=${video.google_drive_file_id}`;

    const response = await fetch(driveUrl, {
      redirect: 'follow',
      headers: {
        'Range': req.headers.range || '',
      }
    });

    // If Google redirects to a virus scan warning page for large files,
    // we need to follow the confirm link
    if (response.headers.get('content-type')?.includes('text/html')) {
      const previewUrl = `https://drive.google.com/uc?export=download&id=${video.google_drive_file_id}&confirm=t`;
      const response2 = await fetch(previewUrl, {
        redirect: 'follow',
        headers: {
          'Range': req.headers.range || '',
        }
      });

      res.setHeader('Content-Type', response2.headers.get('content-type') || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      if (response2.headers.get('content-length')) {
        res.setHeader('Content-Length', response2.headers.get('content-length'));
      }
      if (response2.headers.get('content-range')) {
        res.setHeader('Content-Range', response2.headers.get('content-range'));
        res.status(206);
      }

      Readable.fromWeb(response2.body).pipe(res);
      return;
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    if (response.headers.get('content-length')) {
      res.setHeader('Content-Length', response.headers.get('content-length'));
    }
    if (response.headers.get('content-range')) {
      res.setHeader('Content-Range', response.headers.get('content-range'));
      res.status(206);
    }

    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'ไม่สามารถสตรีมวีดีโอได้' });
  }
});

// Get video info (public - for students with code)
router.get('/:id/info', (req, res) => {
  const { id } = req.params;
  const { code } = req.query;

  const video = db.getVideoById(id);
  if (!video) {
    return res.status(404).json({ error: 'ไม่พบวีดีโอนี้' });
  }

  const classroom = db.getClassroomById(video.classroom_id);
  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  if (code && classroom.code !== code.toUpperCase()) {
    return res.status(403).json({ error: 'รหัสกลุ่มไม่ถูกต้อง' });
  }

  res.json({
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      order_index: video.order_index,
      created_at: video.created_at,
      classroom_id: video.classroom_id,
      classroom_name: classroom.name,
    }
  });
});

export default router;
