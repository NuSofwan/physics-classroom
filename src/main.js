import './styles/main.css';
import { getHashPath, navigateTo, isAdmin, runCleanups } from './utils.js';

// Page imports
import { renderHome, initHome } from './pages/home.js';
import { renderAdminLogin, initAdminLogin } from './pages/admin-login.js';
import { renderAdminDashboard, initAdminDashboard } from './pages/admin-dashboard.js';
import { renderAdminClassroom, initAdminClassroom } from './pages/admin-classroom.js';
import { renderStudentClassroom, initStudentClassroom } from './pages/student-classroom.js';
import { renderVideoPlayer, initVideoPlayer } from './pages/video-player.js';

const app = document.getElementById('app');

// ── Router ──
async function router() {
  // Dispose any listeners/timers the previous page registered.
  runCleanups();

  const path = getHashPath();
  const parts = path.split('/').filter(Boolean);

  // Route matching
  if (path === '/' || path === '') {
    // Home
    app.innerHTML = renderHome();
    initHome(navigateTo);
  }
  else if (path === '/admin/login') {
    app.innerHTML = renderAdminLogin();
    initAdminLogin(navigateTo);
  }
  else if (path === '/admin/dashboard') {
    if (!isAdmin()) {
      navigateTo('/admin/login');
      return;
    }
    app.innerHTML = renderAdminDashboard();
    await initAdminDashboard(navigateTo);
  }
  else if (parts[0] === 'admin' && parts[1] === 'classroom' && parts[2]) {
    if (!isAdmin()) {
      navigateTo('/admin/login');
      return;
    }
    const classroomId = parts[2];
    app.innerHTML = renderAdminClassroom();
    await initAdminClassroom(navigateTo, classroomId);
  }
  else if (parts[0] === 'classroom' && parts[1]) {
    // Student classroom view
    const code = parts[1].toUpperCase();
    app.innerHTML = renderStudentClassroom();
    await initStudentClassroom(navigateTo, code);
  }
  else if (parts[0] === 'join' && parts[1]) {
    // Direct join link - redirect to classroom view
    const code = parts[1].toUpperCase();
    navigateTo(`/classroom/${code}`);
  }
  else if (parts[0] === 'watch' && parts[1]) {
    // Video player
    const videoId = parts[1];
    const code = parts[2] || '';
    app.innerHTML = renderVideoPlayer();
    await initVideoPlayer(navigateTo, videoId, code);
  }
  else {
    // 404
    app.innerHTML = `
      <div class="page" style="display:flex; align-items:center; justify-content:center; min-height:100vh;">
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h2>ไม่พบหน้าที่ต้องการ</h2>
          <a href="#/" class="btn btn-primary" style="margin-top: var(--space-lg);">กลับหน้าหลัก</a>
        </div>
      </div>
    `;
  }

  // Scroll to top on navigation
  window.scrollTo(0, 0);
}

// Listen for hash changes
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// If no hash, set to root
if (!window.location.hash) {
  window.location.hash = '/';
}
