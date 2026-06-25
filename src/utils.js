// ── API Helper ──
const API_BASE = '/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'เกิดข้อผิดพลาด');
  }

  return data;
}

// ── Toast Notifications ──
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ── Admin Auth ──
export function isAdmin() {
  return !!localStorage.getItem('admin_token');
}

export function logout() {
  // Best-effort server-side invalidation; navigate regardless.
  api('/auth/logout', { method: 'POST' }).catch(() => {});
  localStorage.removeItem('admin_token');
  navigateTo('/');
}

// ── Route cleanup registry ──
// Pages register teardown callbacks (e.g. to remove document-level event
// listeners) so the SPA router can dispose them before rendering the next view.
let cleanups = [];

export function registerCleanup(fn) {
  if (typeof fn === 'function') cleanups.push(fn);
}

export function runCleanups() {
  const pending = cleanups;
  cleanups = [];
  pending.forEach((fn) => {
    try { fn(); } catch { /* ignore teardown errors */ }
  });
}

// ── Classroom Code (student session) ──
export function getStudentCode() {
  return sessionStorage.getItem('classroom_code');
}

export function setStudentCode(code) {
  sessionStorage.setItem('classroom_code', code);
}

// ── Simple Hash Router ──
let currentCleanup = null;

export function navigateTo(path) {
  window.location.hash = path;
}

export function getHashPath() {
  return window.location.hash.slice(1) || '/';
}

export function getParams() {
  const path = getHashPath();
  const parts = path.split('/').filter(Boolean);
  return parts;
}

// ── Format Helpers ──
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Group videos into section buckets, sorted by section order_index.
// Returns [{ section: {...}|null, videos: [...] }] — ungrouped ("ทั่วไป") is last.
export function groupVideosBySection(videos, sections) {
  const byId = new Map(sections.map(s => [s.id, { section: s, videos: [] }]));
  const ungrouped = { section: null, videos: [] };
  for (const v of videos) {
    const bucket = (v.section_id && byId.get(v.section_id)) || ungrouped;
    bucket.videos.push(v);
  }
  const sortVideos = (arr, mode) => arr.sort((a, b) =>
    mode === 'manual'
      ? (a.order_index - b.order_index) || (new Date(a.created_at) - new Date(b.created_at))
      : (new Date(a.created_at) - new Date(b.created_at))
  );
  const groups = [...sections]
    .sort((a, b) => a.order_index - b.order_index)
    .map(s => { const g = byId.get(s.id); sortVideos(g.videos, s.sort_mode); return g; });
  if (ungrouped.videos.length) { sortVideos(ungrouped.videos, 'date'); groups.push(ungrouped); }
  return groups;
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('คัดลอกแล้ว!', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('คัดลอกแล้ว!', 'success');
  });
}
