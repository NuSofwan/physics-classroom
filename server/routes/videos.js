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

// Fetch from Google Drive following the large-file "virus scan" confirmation
// page when necessary. Returns a Web Response whose body can be streamed.
async function fetchFromDrive(fileId, range) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; PhysicsClassroom/1.0)',
  };
  // Only forward a Range header when the client actually sent one — an empty
  // Range header makes some upstreams reply with an error instead of the file.
  if (range) headers['Range'] = range;

  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let response = await fetch(baseUrl, { redirect: 'follow', headers });

  // Large files return an HTML interstitial instead of the binary. Parse the
  // confirmation token from it and retry, otherwise fall back to confirm=t.
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const html = await response.text();
    const tokenMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
    const uuidMatch = html.match(/name="uuid" value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : 't';

    let confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${token}`;
    if (uuidMatch) confirmUrl += `&uuid=${uuidMatch[1]}`;

    response = await fetch(confirmUrl, { redirect: 'follow', headers });
  }

  return response;
}

// Stream video from Google Drive (proxy) - accessible by students with valid classroom code
router.get('/:id/stream', async (req, res) => {
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

  // Validate classroom code for student access
  if (code && classroom.code !== code.toUpperCase()) {
    return res.status(403).json({ error: 'รหัสกลุ่มไม่ถูกต้อง' });
  }

  try {
    const response = await fetchFromDrive(video.google_drive_file_id, req.headers.range);

    if (!response.ok && response.status !== 206) {
      console.error('Drive responded with', response.status);
      return res.status(502).json({ error: 'ไม่สามารถดึงวีดีโอจาก Google Drive ได้ ตรวจสอบการแชร์ไฟล์เป็น "ทุกคนที่มีลิงก์"' });
    }

    // Mirror the upstream status (206 for partial content, 200 for full).
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', response.headers.get('accept-ranges') || 'bytes');
    res.setHeader('Cache-Control', 'no-store');

    const contentLength = response.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = response.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (!response.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(response.body);
    // Avoid "write after end" crashes if the client (browser) aborts mid-seek.
    req.on('close', () => nodeStream.destroy());
    nodeStream.on('error', (err) => {
      if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error('Stream pipe error:', err.message);
      }
      res.destroy();
    });
    nodeStream.pipe(res);
  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'ไม่สามารถสตรีมวีดีโอได้' });
    }
  }
});

// Reorder videos within a classroom (admin)
router.put('/classroom/:classroomId/reorder', requireAdmin, (req, res) => {
  const { classroomId } = req.params;
  const { order } = req.body; // array of video ids in the desired order

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'รูปแบบลำดับไม่ถูกต้อง' });
  }

  const classroom = db.getClassroomById(classroomId);
  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  order.forEach((videoId, idx) => {
    const v = db.getVideoById(videoId);
    if (v && v.classroom_id === classroomId) {
      db.updateVideo(videoId, { order_index: idx + 1 });
    }
  });

  res.json({ videos: db.getVideosByClassroom(classroomId) });
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
