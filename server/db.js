import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'physics-classroom.json');

// Default data structure
const defaultData = {
  classrooms: [],
  videos: [],
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading database:', err.message);
  }
  return { ...defaultData };
}

// Save data to file
function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Database API (mimics simple query patterns) ──

const db = {
  // Get all data
  getData() {
    return loadData();
  },

  // ── Classrooms ──
  getAllClassrooms() {
    const data = loadData();
    return data.classrooms.map(c => {
      const videoCount = data.videos.filter(v => v.classroom_id === c.id).length;
      return { ...c, video_count: videoCount };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getClassroomById(id) {
    const data = loadData();
    return data.classrooms.find(c => c.id === id) || null;
  },

  getClassroomByCode(code) {
    const data = loadData();
    return data.classrooms.find(c => c.code === code) || null;
  },

  createClassroom(classroom) {
    const data = loadData();
    data.classrooms.push(classroom);
    saveData(data);
    return classroom;
  },

  updateClassroom(id, updates) {
    const data = loadData();
    const idx = data.classrooms.findIndex(c => c.id === id);
    if (idx === -1) return null;
    data.classrooms[idx] = { ...data.classrooms[idx], ...updates, updated_at: new Date().toISOString() };
    saveData(data);
    return data.classrooms[idx];
  },

  deleteClassroom(id) {
    const data = loadData();
    data.classrooms = data.classrooms.filter(c => c.id !== id);
    // Also delete associated videos
    data.videos = data.videos.filter(v => v.classroom_id !== id);
    saveData(data);
    return true;
  },

  // ── Videos ──
  getVideosByClassroom(classroomId) {
    const data = loadData();
    return data.videos
      .filter(v => v.classroom_id === classroomId)
      .sort((a, b) => a.order_index - b.order_index || new Date(a.created_at) - new Date(b.created_at));
  },

  getVideoById(id) {
    const data = loadData();
    return data.videos.find(v => v.id === id) || null;
  },

  createVideo(video) {
    const data = loadData();
    data.videos.push(video);
    saveData(data);
    return video;
  },

  updateVideo(id, updates) {
    const data = loadData();
    const idx = data.videos.findIndex(v => v.id === id);
    if (idx === -1) return null;
    data.videos[idx] = { ...data.videos[idx], ...updates, updated_at: new Date().toISOString() };
    saveData(data);
    return data.videos[idx];
  },

  deleteVideo(id) {
    const data = loadData();
    data.videos = data.videos.filter(v => v.id !== id);
    saveData(data);
    return true;
  },

  getMaxVideoOrder(classroomId) {
    const videos = this.getVideosByClassroom(classroomId);
    if (videos.length === 0) return 0;
    return Math.max(...videos.map(v => v.order_index || 0));
  },
};

export default db;
