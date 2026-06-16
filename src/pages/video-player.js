import { api, showToast, formatTime, registerCleanup } from '../utils.js';

export function renderVideoPlayer() {
  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="#/" class="navbar-brand">
          <span class="logo-icon">⚛️</span>
          <span class="brand-text">PhysicsClassroom</span>
        </a>
        <div class="navbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-back-to-classroom">← กลับห้องเรียน</button>
        </div>
      </div>
    </nav>

    <div class="player-container">
      <div id="player-loading" class="loading-page">
        <div class="spinner"></div>
        <div class="loading-text">กำลังโหลดวีดีโอ...</div>
      </div>

      <div id="player-content" style="display: none;">
        <!-- Video Player -->
        <div class="video-player-wrapper paused" id="video-wrapper">
          <video id="video-element" preload="metadata" playsinline webkit-playsinline x5-playsinline></video>

          <!-- Buffering spinner -->
          <div class="buffer-spinner" id="buffer-spinner"><div class="spinner"></div></div>

          <!-- Center Play Button -->
          <button class="center-play" id="center-play-btn" aria-label="Play">▶</button>

          <!-- Double-tap seek zones (mobile) -->
          <div class="tap-zone left" id="tap-left"></div>
          <div class="tap-zone right" id="tap-right"></div>

          <!-- Skip Indicators -->
          <div class="skip-indicator left" id="skip-left">⏪ -10s</div>
          <div class="skip-indicator right" id="skip-right">⏩ +10s</div>

          <!-- Controls Overlay -->
          <div class="player-controls" id="player-controls">
            <!-- Progress Bar -->
            <div class="progress-container" id="progress-container">
              <div class="progress-buffered" id="progress-buffered"></div>
              <div class="progress-bar" id="progress-bar"></div>
              <div class="progress-tooltip" id="progress-tooltip">0:00</div>
            </div>

            <!-- Controls Row -->
            <div class="controls-row">
              <div class="controls-left">
                <button class="control-btn play-btn" id="play-btn" aria-label="Play/Pause" title="Play/Pause (Space)">▶️</button>
                <button class="control-btn" id="skip-back-btn" aria-label="ย้อนกลับ 10 วินาที" title="ย้อนกลับ 10 วินาที (←)">⏪</button>
                <button class="control-btn" id="skip-forward-btn" aria-label="ข้ามไป 10 วินาที" title="ข้ามไป 10 วินาที (→)">⏩</button>

                <div class="volume-control">
                  <button class="control-btn" id="volume-btn" aria-label="เสียง" title="ปิด/เปิดเสียง (M)">🔊</button>
                  <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.05" value="1" aria-label="ระดับเสียง" />
                </div>

                <span class="time-display" id="time-display">0:00 / 0:00</span>
              </div>

              <div class="controls-right">
                <!-- Speed Control -->
                <div class="speed-control">
                  <button class="control-btn speed-btn" id="speed-btn" title="ปรับความเร็ว">1x</button>
                  <div class="speed-menu" id="speed-menu">
                    <button class="speed-option" data-speed="0.25">0.25x</button>
                    <button class="speed-option" data-speed="0.5">0.5x</button>
                    <button class="speed-option" data-speed="0.75">0.75x</button>
                    <button class="speed-option active" data-speed="1">ปกติ (1x)</button>
                    <button class="speed-option" data-speed="1.25">1.25x</button>
                    <button class="speed-option" data-speed="1.5">1.5x</button>
                    <button class="speed-option" data-speed="1.75">1.75x</button>
                    <button class="speed-option" data-speed="2">2x</button>
                  </div>
                </div>

                <!-- Picture-in-Picture -->
                <button class="control-btn" id="pip-btn" aria-label="Picture-in-Picture" title="Picture-in-Picture (P)">📌</button>

                <!-- Fullscreen -->
                <button class="control-btn" id="fullscreen-btn" aria-label="เต็มจอ" title="เต็มจอ (F)">⛶</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Video Info -->
        <div class="player-info">
          <h1 class="player-video-title" id="player-title"></h1>
          <div class="player-video-meta" id="player-meta"></div>
          <p id="player-description" style="color: var(--text-secondary); line-height: 1.8; margin-top: var(--space-md);"></p>

          <!-- Prev / Next navigation -->
          <div class="player-nav" id="player-nav"></div>
        </div>

        <!-- Keyboard shortcuts hint -->
        <div class="card card-sm shortcuts-hint" style="margin-top: var(--space-xl); max-width: 600px;">
          <h3 style="font-size: 0.95rem; margin-bottom: var(--space-md); color: var(--text-secondary);">⌨️ ปุ่มลัด</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.85rem; color: var(--text-muted);">
            <div><kbd>Space</kbd> เล่น/หยุด</div>
            <div><kbd>←</kbd> ย้อนกลับ 10 วินาที</div>
            <div><kbd>→</kbd> ข้ามไป 10 วินาที</div>
            <div><kbd>J</kbd> ย้อนกลับ 30 วินาที</div>
            <div><kbd>L</kbd> ข้ามไป 30 วินาที</div>
            <div><kbd>K</kbd> เล่น/หยุด</div>
            <div><kbd>M</kbd> ปิด/เปิดเสียง</div>
            <div><kbd>F</kbd> เต็มจอ</div>
            <div><kbd>&lt; / &gt;</kbd> ปรับความเร็ว</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initVideoPlayer(navigateTo, videoId, classroomCode) {
  document.getElementById('btn-back-to-classroom').addEventListener('click', () => {
    navigateTo(classroomCode ? `/classroom/${classroomCode}` : '/');
  });

  try {
    const { video } = await api(`/videos/${videoId}/info?code=${classroomCode || ''}`);

    const videoEl = document.getElementById('video-element');
    videoEl.src = `/api/videos/${videoId}/stream?code=${classroomCode || ''}`;

    document.getElementById('player-loading').style.display = 'none';
    document.getElementById('player-content').style.display = 'block';

    document.getElementById('player-title').textContent = video.title;
    document.getElementById('player-meta').textContent = video.classroom_name || '';
    document.getElementById('player-description').textContent = video.description || '';

    // Build prev/next navigation from the classroom playlist.
    if (classroomCode) {
      buildPlaylistNav(navigateTo, videoId, classroomCode).catch(() => {});
    }

    initPlayerControls(videoEl, videoId);
  } catch (err) {
    document.getElementById('player-loading').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <div class="empty-text">${err.message}</div>
        <a href="#/" class="btn btn-primary">กลับหน้าหลัก</a>
      </div>
    `;
  }
}

async function buildPlaylistNav(navigateTo, videoId, classroomCode) {
  const { videos } = await api(`/classrooms/code/${classroomCode}`);
  const idx = videos.findIndex((v) => v.id === videoId);
  if (idx === -1) return;

  const prev = videos[idx - 1];
  const next = videos[idx + 1];
  const nav = document.getElementById('player-nav');
  if (!nav) return;

  nav.innerHTML = `
    ${prev ? `<button class="btn btn-secondary" id="btn-prev-video">← บทก่อนหน้า</button>` : '<span></span>'}
    <span class="player-nav-pos">${idx + 1} / ${videos.length}</span>
    ${next ? `<button class="btn btn-primary" id="btn-next-video">บทถัดไป →</button>` : '<span></span>'}
  `;

  const prevBtn = document.getElementById('btn-prev-video');
  if (prevBtn) prevBtn.addEventListener('click', () => navigateTo(`/watch/${prev.id}/${classroomCode}`));
  const nextBtn = document.getElementById('btn-next-video');
  if (nextBtn) nextBtn.addEventListener('click', () => navigateTo(`/watch/${next.id}/${classroomCode}`));
}

function initPlayerControls(video, videoId) {
  const wrapper = document.getElementById('video-wrapper');
  const playBtn = document.getElementById('play-btn');
  const centerPlayBtn = document.getElementById('center-play-btn');
  const skipBackBtn = document.getElementById('skip-back-btn');
  const skipForwardBtn = document.getElementById('skip-forward-btn');
  const volumeBtn = document.getElementById('volume-btn');
  const volumeSlider = document.getElementById('volume-slider');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressBuffered = document.getElementById('progress-buffered');
  const progressTooltip = document.getElementById('progress-tooltip');
  const timeDisplay = document.getElementById('time-display');
  const speedBtn = document.getElementById('speed-btn');
  const speedMenu = document.getElementById('speed-menu');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const pipBtn = document.getElementById('pip-btn');
  const bufferSpinner = document.getElementById('buffer-spinner');
  const skipLeftIndicator = document.getElementById('skip-left');
  const skipRightIndicator = document.getElementById('skip-right');
  const tapLeft = document.getElementById('tap-left');
  const tapRight = document.getElementById('tap-right');

  // Document-level listeners are scoped to an AbortController so the router
  // can tear them all down on navigation (prevents handler stacking / leaks).
  const ac = new AbortController();
  const { signal } = ac;
  let controlsTimeout;
  let saveTimer;
  registerCleanup(() => {
    ac.abort();
    clearTimeout(controlsTimeout);
    clearInterval(saveTimer);
    try { video.pause(); } catch { /* noop */ }
    video.removeAttribute('src');
    video.load();
  });

  let currentSpeed = 1;
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const RESUME_KEY = `resume_${videoId}`;

  // ── Restore remembered preferences ──
  const savedVol = parseFloat(localStorage.getItem('player_volume'));
  if (!isNaN(savedVol)) {
    video.volume = savedVol;
    volumeSlider.value = savedVol;
  }
  const savedSpeed = parseFloat(localStorage.getItem('player_speed'));
  if (!isNaN(savedSpeed) && speeds.includes(savedSpeed)) {
    currentSpeed = savedSpeed;
    applySpeed(savedSpeed);
  }

  // ── Play/Pause ──
  function togglePlay() {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  video.addEventListener('play', () => {
    wrapper.classList.remove('paused');
    playBtn.textContent = '⏸️';
    centerPlayBtn.textContent = '⏸';
  });

  video.addEventListener('pause', () => {
    wrapper.classList.add('paused');
    playBtn.textContent = '▶️';
    centerPlayBtn.textContent = '▶';
  });

  playBtn.addEventListener('click', togglePlay);
  centerPlayBtn.addEventListener('click', togglePlay);

  // ── Buffering indicator ──
  video.addEventListener('waiting', () => bufferSpinner.classList.add('show'));
  video.addEventListener('playing', () => bufferSpinner.classList.remove('show'));
  video.addEventListener('canplay', () => bufferSpinner.classList.remove('show'));

  // ── Resume playback position ──
  video.addEventListener('loadedmetadata', () => {
    const saved = parseFloat(localStorage.getItem(RESUME_KEY));
    if (!isNaN(saved) && saved > 5 && video.duration && saved < video.duration - 5) {
      video.currentTime = saved;
      showToast('เล่นต่อจากที่ดูค้างไว้', 'info');
    }
  });

  saveTimer = setInterval(() => {
    if (!video.paused && video.currentTime > 0) {
      localStorage.setItem(RESUME_KEY, String(video.currentTime));
    }
  }, 5000);

  video.addEventListener('ended', () => localStorage.removeItem(RESUME_KEY));

  // ── Progress Bar ──
  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      progressBar.style.width = `${pct}%`;
      timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
  });

  video.addEventListener('progress', () => {
    if (video.buffered.length > 0 && video.duration) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      progressBuffered.style.width = `${(bufferedEnd / video.duration) * 100}%`;
    }
  });

  // ── Seeking (pointer events cover both mouse and touch) ──
  let isDragging = false;

  function seekToClientX(clientX) {
    if (!video.duration) return;
    const rect = progressContainer.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
  }

  progressContainer.addEventListener('pointerdown', (e) => {
    isDragging = true;
    progressContainer.setPointerCapture?.(e.pointerId);
    seekToClientX(e.clientX);
  });

  progressContainer.addEventListener('pointermove', (e) => {
    if (isDragging) seekToClientX(e.clientX);
    if (video.duration) {
      const rect = progressContainer.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      progressTooltip.textContent = formatTime(pct * video.duration);
      progressTooltip.style.left = `${pct * 100}%`;
    }
  });

  const endDrag = () => { isDragging = false; };
  document.addEventListener('pointerup', endDrag, { signal });
  document.addEventListener('pointercancel', endDrag, { signal });

  // ── Skip ──
  function skip(seconds) {
    if (!video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    const indicator = seconds < 0 ? skipLeftIndicator : skipRightIndicator;
    indicator.textContent = seconds < 0 ? `⏪ ${seconds}s` : `⏩ +${seconds}s`;
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 600);
  }

  skipBackBtn.addEventListener('click', () => skip(-10));
  skipForwardBtn.addEventListener('click', () => skip(10));

  // Double-tap zones for mobile seek; single tap toggles controls/play.
  let lastTap = 0;
  function handleTapZone(seconds) {
    return () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        skip(seconds);
      } else {
        showControls();
        togglePlay();
      }
      lastTap = now;
    };
  }
  tapLeft.addEventListener('click', handleTapZone(-10));
  tapRight.addEventListener('click', handleTapZone(10));

  // ── Volume ──
  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon();
  });

  volumeSlider.addEventListener('input', () => {
    video.volume = parseFloat(volumeSlider.value);
    video.muted = false;
    localStorage.setItem('player_volume', volumeSlider.value);
    updateVolumeIcon();
  });

  function updateVolumeIcon() {
    if (video.muted || video.volume === 0) {
      volumeBtn.textContent = '🔇';
      volumeSlider.value = 0;
    } else if (video.volume < 0.5) {
      volumeBtn.textContent = '🔉';
    } else {
      volumeBtn.textContent = '🔊';
    }
  }
  updateVolumeIcon();

  // ── Speed ──
  function applySpeed(speed) {
    video.playbackRate = speed;
    currentSpeed = speed;
    speedBtn.textContent = speed === 1 ? '1x' : `${speed}x`;
    localStorage.setItem('player_speed', String(speed));
    speedMenu.querySelectorAll('.speed-option').forEach((o) => {
      o.classList.toggle('active', parseFloat(o.dataset.speed) === speed);
    });
  }
  // Re-apply rate once the element is ready (rate resets on src change).
  video.addEventListener('loadedmetadata', () => { video.playbackRate = currentSpeed; });

  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.toggle('active');
  });

  speedMenu.querySelectorAll('.speed-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      applySpeed(parseFloat(option.dataset.speed));
      speedMenu.classList.remove('active');
    });
  });

  document.addEventListener('click', () => speedMenu.classList.remove('active'), { signal });

  // ── Fullscreen (with iOS Safari fallback) ──
  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (wrapper.requestFullscreen) {
      wrapper.requestFullscreen();
    } else if (wrapper.webkitRequestFullscreen) {
      wrapper.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      // iOS iPhone only supports native fullscreen on the <video> element.
      video.webkitEnterFullscreen();
    } else {
      showToast('อุปกรณ์นี้ไม่รองรับโหมดเต็มจอ', 'error');
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  video.addEventListener('dblclick', toggleFullscreen);

  // ── Picture-in-Picture ──
  pipBtn.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else throw new Error('unsupported');
    } catch {
      showToast('ไม่รองรับ Picture-in-Picture', 'error');
    }
  });

  // ── Controls visibility ──
  function showControls() {
    wrapper.classList.add('controls-active');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!video.paused) wrapper.classList.remove('controls-active');
    }, 3000);
  }

  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('touchstart', showControls, { passive: true });

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(10);
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        skip(-30);
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        skip(30);
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        video.muted = !video.muted;
        updateVolumeIcon();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        pipBtn.click();
        break;
      case '>':
      case '.': {
        e.preventDefault();
        const idx = speeds.indexOf(currentSpeed);
        if (idx < speeds.length - 1) {
          applySpeed(speeds[idx + 1]);
          showToast(`ความเร็ว ${currentSpeed}x`, 'info');
        }
        break;
      }
      case '<':
      case ',': {
        e.preventDefault();
        const idx = speeds.indexOf(currentSpeed);
        if (idx > 0) {
          applySpeed(speeds[idx - 1]);
          showToast(`ความเร็ว ${currentSpeed}x`, 'info');
        }
        break;
      }
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        volumeSlider.value = video.volume;
        localStorage.setItem('player_volume', String(video.volume));
        updateVolumeIcon();
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        volumeSlider.value = video.volume;
        localStorage.setItem('player_volume', String(video.volume));
        updateVolumeIcon();
        break;
    }
  }, { signal });

  // ── Error handling ──
  video.addEventListener('error', () => {
    bufferSpinner.classList.remove('show');
    showToast('ไม่สามารถโหลดวีดีโอได้ ตรวจสอบว่าไฟล์ใน Google Drive ตั้งการแชร์เป็น "ทุกคนที่มีลิงก์"', 'error');
  });
}
