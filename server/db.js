import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'physics-classroom.json');
const defaultData = { classrooms: [], videos: [], sections: [] };

// ─────────────────────────────────────────────────────────────────────────
// File backend (used for local dev when MONGODB_URI is not set).
// Data is NOT persistent on ephemeral hosts — see README.
// ─────────────────────────────────────────────────────────────────────────
function loadData() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading database:', err.message);
  }
  return { ...defaultData };
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

const fileBackend = {
  async getAllClassrooms() {
    const data = loadData();
    return data.classrooms
      .map((c) => ({
        ...c,
        video_count: data.videos.filter((v) => v.classroom_id === c.id).length,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async getClassroomById(id) {
    return loadData().classrooms.find((c) => c.id === id) || null;
  },
  async getClassroomByCode(code) {
    return loadData().classrooms.find((c) => c.code === code) || null;
  },
  async createClassroom(classroom) {
    const data = loadData();
    data.classrooms.push(classroom);
    saveData(data);
    return classroom;
  },
  async updateClassroom(id, updates) {
    const data = loadData();
    const idx = data.classrooms.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    data.classrooms[idx] = { ...data.classrooms[idx], ...updates, updated_at: new Date().toISOString() };
    saveData(data);
    return data.classrooms[idx];
  },
  async deleteClassroom(id) {
    const data = loadData();
    data.classrooms = data.classrooms.filter((c) => c.id !== id);
    data.videos = data.videos.filter((v) => v.classroom_id !== id);
    saveData(data);
    return true;
  },
  async getVideosByClassroom(classroomId) {
    return loadData()
      .videos.filter((v) => v.classroom_id === classroomId)
      .sort((a, b) => a.order_index - b.order_index || new Date(a.created_at) - new Date(b.created_at));
  },
  async getVideoById(id) {
    return loadData().videos.find((v) => v.id === id) || null;
  },
  async createVideo(video) {
    const data = loadData();
    data.videos.push(video);
    saveData(data);
    return video;
  },
  async updateVideo(id, updates) {
    const data = loadData();
    const idx = data.videos.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    data.videos[idx] = { ...data.videos[idx], ...updates, updated_at: new Date().toISOString() };
    saveData(data);
    return data.videos[idx];
  },
  async deleteVideo(id) {
    const data = loadData();
    data.videos = data.videos.filter((v) => v.id !== id);
    saveData(data);
    return true;
  },
  async getMaxVideoOrder(classroomId) {
    const videos = await this.getVideosByClassroom(classroomId);
    if (videos.length === 0) return 0;
    return Math.max(...videos.map((v) => v.order_index || 0));
  },
  async getSectionsByClassroom(classroomId) {
    const data = loadData();
    return (data.sections || [])
      .filter((s) => s.classroom_id === classroomId)
      .sort((a, b) => a.order_index - b.order_index || new Date(a.created_at) - new Date(b.created_at));
  },
  async getSectionById(id) {
    return (loadData().sections || []).find((s) => s.id === id) || null;
  },
  async createSection(section) {
    const data = loadData();
    if (!data.sections) data.sections = [];
    data.sections.push(section);
    saveData(data);
    return section;
  },
  async updateSection(id, updates) {
    const data = loadData();
    if (!data.sections) data.sections = [];
    const idx = data.sections.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    data.sections[idx] = { ...data.sections[idx], ...updates, updated_at: new Date().toISOString() };
    saveData(data);
    return data.sections[idx];
  },
  async deleteSection(id) {
    const data = loadData();
    data.sections = (data.sections || []).filter((s) => s.id !== id);
    data.videos = data.videos.map((v) => v.section_id === id ? { ...v, section_id: null } : v);
    saveData(data);
    return true;
  },
  async getMaxSectionOrder(classroomId) {
    const sections = await this.getSectionsByClassroom(classroomId);
    if (sections.length === 0) return 0;
    return Math.max(...sections.map((s) => s.order_index || 0));
  },
  async getMaxVideoOrderInSection(classroomId, sectionId) {
    const data = loadData();
    const vids = data.videos.filter((v) => v.classroom_id === classroomId && v.section_id === sectionId);
    if (vids.length === 0) return 0;
    return Math.max(...vids.map((v) => v.order_index || 0));
  },
};

// ─────────────────────────────────────────────────────────────────────────
// MongoDB backend (used in production when MONGODB_URI is set). Persistent.
// ─────────────────────────────────────────────────────────────────────────
function makeMongoBackend(client, dbName) {
  const database = client.db(dbName);
  const classroomsCol = database.collection('classrooms');
  const videosCol = database.collection('videos');
  const sectionsCol = database.collection('sections');
  const strip = { projection: { _id: 0 } };

  return {
    async getAllClassrooms() {
      const classrooms = await classroomsCol.find({}, strip).sort({ created_at: -1 }).toArray();
      return Promise.all(
        classrooms.map(async (c) => ({
          ...c,
          video_count: await videosCol.countDocuments({ classroom_id: c.id }),
        }))
      );
    },
    async getClassroomById(id) {
      return classroomsCol.findOne({ id }, strip);
    },
    async getClassroomByCode(code) {
      return classroomsCol.findOne({ code }, strip);
    },
    async createClassroom(classroom) {
      await classroomsCol.insertOne({ ...classroom });
      return classroom;
    },
    async updateClassroom(id, updates) {
      const result = await classroomsCol.findOneAndUpdate(
        { id },
        { $set: { ...updates, updated_at: new Date().toISOString() } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return result || null;
    },
    async deleteClassroom(id) {
      await classroomsCol.deleteOne({ id });
      await videosCol.deleteMany({ classroom_id: id });
      return true;
    },
    async getVideosByClassroom(classroomId) {
      return videosCol
        .find({ classroom_id: classroomId }, strip)
        .sort({ order_index: 1, created_at: 1 })
        .toArray();
    },
    async getVideoById(id) {
      return videosCol.findOne({ id }, strip);
    },
    async createVideo(video) {
      await videosCol.insertOne({ ...video });
      return video;
    },
    async updateVideo(id, updates) {
      const result = await videosCol.findOneAndUpdate(
        { id },
        { $set: { ...updates, updated_at: new Date().toISOString() } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return result || null;
    },
    async deleteVideo(id) {
      await videosCol.deleteOne({ id });
      return true;
    },
    async getMaxVideoOrder(classroomId) {
      const top = await videosCol
        .find({ classroom_id: classroomId })
        .sort({ order_index: -1 })
        .limit(1)
        .toArray();
      return top.length ? top[0].order_index || 0 : 0;
    },
    async getSectionsByClassroom(classroomId) {
      return sectionsCol
        .find({ classroom_id: classroomId }, strip)
        .sort({ order_index: 1, created_at: 1 })
        .toArray();
    },
    async getSectionById(id) {
      return sectionsCol.findOne({ id }, strip);
    },
    async createSection(section) {
      await sectionsCol.insertOne({ ...section });
      return section;
    },
    async updateSection(id, updates) {
      const result = await sectionsCol.findOneAndUpdate(
        { id },
        { $set: { ...updates, updated_at: new Date().toISOString() } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return result || null;
    },
    async deleteSection(id) {
      await sectionsCol.deleteOne({ id });
      await videosCol.updateMany({ section_id: id }, { $set: { section_id: null } });
      return true;
    },
    async getMaxSectionOrder(classroomId) {
      const top = await sectionsCol
        .find({ classroom_id: classroomId })
        .sort({ order_index: -1 })
        .limit(1)
        .toArray();
      return top.length ? top[0].order_index || 0 : 0;
    },
    async getMaxVideoOrderInSection(classroomId, sectionId) {
      const top = await videosCol
        .find({ classroom_id: classroomId, section_id: sectionId })
        .sort({ order_index: -1 })
        .limit(1)
        .toArray();
      return top.length ? top[0].order_index || 0 : 0;
    },
    _collections: { classroomsCol, videosCol, sectionsCol },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Backend selection + one-time initialisation.
// ─────────────────────────────────────────────────────────────────────────
let backend = fileBackend;

export async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('💾 Database: local JSON file (set MONGODB_URI for persistent storage)');
    return;
  }

  const dbName = process.env.MONGODB_DB || 'physics_classroom';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const mongo = makeMongoBackend(client, dbName);

  // Seed the demo classroom from the bundled JSON on first run (empty DB).
  const count = await mongo._collections.classroomsCol.countDocuments();
  if (count === 0) {
    const seed = loadData();
    if (seed.classrooms?.length) {
      await mongo._collections.classroomsCol.insertMany(seed.classrooms.map((c) => ({ ...c })));
      if (seed.videos?.length) {
        await mongo._collections.videosCol.insertMany(seed.videos.map((v) => ({ ...v })));
      }
      if (seed.sections?.length) {
        await mongo._collections.sectionsCol.insertMany(seed.sections.map((s) => ({ ...s })));
      }
      console.log(`🌱 Seeded ${seed.classrooms.length} classroom(s) into MongoDB`);
    }
  }

  backend = mongo;
  console.log(`💾 Database: MongoDB (${dbName}) — persistent ✅`);
}

// Proxy that always forwards to the currently selected backend.
const db = {
  getAllClassrooms: (...a) => backend.getAllClassrooms(...a),
  getClassroomById: (...a) => backend.getClassroomById(...a),
  getClassroomByCode: (...a) => backend.getClassroomByCode(...a),
  createClassroom: (...a) => backend.createClassroom(...a),
  updateClassroom: (...a) => backend.updateClassroom(...a),
  deleteClassroom: (...a) => backend.deleteClassroom(...a),
  getVideosByClassroom: (...a) => backend.getVideosByClassroom(...a),
  getVideoById: (...a) => backend.getVideoById(...a),
  createVideo: (...a) => backend.createVideo(...a),
  updateVideo: (...a) => backend.updateVideo(...a),
  deleteVideo: (...a) => backend.deleteVideo(...a),
  getMaxVideoOrder: (...a) => backend.getMaxVideoOrder(...a),
  getSectionsByClassroom: (...a) => backend.getSectionsByClassroom(...a),
  getSectionById: (...a) => backend.getSectionById(...a),
  createSection: (...a) => backend.createSection(...a),
  updateSection: (...a) => backend.updateSection(...a),
  deleteSection: (...a) => backend.deleteSection(...a),
  getMaxSectionOrder: (...a) => backend.getMaxSectionOrder(...a),
  getMaxVideoOrderInSection: (...a) => backend.getMaxVideoOrderInSection(...a),
};

export default db;
