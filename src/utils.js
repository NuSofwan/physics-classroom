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
  localStorage.removeItem('admin_token');
  navigateTo('/');
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
