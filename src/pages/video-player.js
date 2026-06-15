import { api, showToast, formatTime } from '../utils.js';

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
          <video id="video-element" preload="metadata" playsinline></video>

          <!-- Center Play Button -->
          <button class="center-play" id="center-play-btn" aria-label="Play">▶</button>

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
                  <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.05" value="1" />
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
        </div>

        <!-- Keyboard shortcuts hint -->
        <div class="card card-sm" style="margin-top: var(--space-xl); max-width: 600px;">
          <h3 style="font-size: 0.95rem; margin-bottom: var(--space-md); color: var(--text-secondary);">⌨️ ปุ่มลัด</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.85rem; color: var(--text-muted);">
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">Space</kbd> เล่น/หยุด</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">←</kbd> ย้อนกลับ 10 วินาที</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">→</kbd> ข้ามไป 10 วินาที</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">J</kbd> ย้อนกลับ 30 วินาที</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">L</kbd> ข้ามไป 30 วินาที</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">K</kbd> เล่น/หยุด</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">M</kbd> ปิด/เปิดเสียง</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">F</kbd> เต็มจอ</div>
            <div><kbd style="background: var(--bg-glass); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">&lt; / &gt;</kbd> ปรับความเร็ว</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initVideoPlayer(navigateTo, videoId, classroomCode) {
  // Back button
  document.getElementById('btn-back-to-classroom').addEventListener('click', () => {
    if (classroomCode) {
      navigateTo(`/classroom/${classroomCode}`);
    } else {
      navigateTo('/');
    }
  });

  try {
    // Load video info
    const { video } = await api(`/videos/${videoId}/info?code=${classroomCode || ''}`);

    // Set video source (proxy through our server)
    const videoEl = document.getElementById('video-element');
    videoEl.src = `/api/videos/${videoId}/stream?code=${classroomCode || ''}`;

    // Show content
    document.getElementById('player-loading').style.display = 'none';
    document.getElementById('player-content').style.display = 'block';

    // Set info
    document.getElementById('player-title').textContent = video.title;
    document.getElementById('player-meta').textContent =
      `${video.classroom_name}`;
    document.getElementById('player-description').textContent = video.description || '';

    // Initialize player controls
    initPlayerControls(videoEl);

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

function initPlayerControls(video) {
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
  const skipLeftIndicator = document.getElementById('skip-left');
  const skipRightIndicator = document.getElementById('skip-right');

  let controlsTimeout;
  let currentSpeed = 1;
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // ── Play/Pause ──
  function togglePlay() {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
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

  // Click on video to play/pause
  video.addEventListener('click', togglePlay);

  // Double-click to fullscreen
  video.addEventListener('dblclick', toggleFullscreen);

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
      const pct = (bufferedEnd / video.duration) * 100;
      progressBuffered.style.width = `${pct}%`;
    }
  });

  // Seek on click
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  });

  // Drag to seek
  let isDragging = false;

  progressContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = progressContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging && video.duration) {
      const rect = progressContainer.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = pct * video.duration;
    }

    // Tooltip
    if (progressContainer.matches(':hover') && video.duration) {
      const rect = progressContainer.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * video.duration;
      progressTooltip.textContent = formatTime(time);
      progressTooltip.style.left = `${pct * 100}%`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // ── Skip ──
  function skip(seconds) {
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));

    // Show indicator
    const indicator = seconds < 0 ? skipLeftIndicator : skipRightIndicator;
    indicator.textContent = seconds < 0 ? `⏪ ${seconds}s` : `⏩ +${seconds}s`;
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 600);
  }

  skipBackBtn.addEventListener('click', () => skip(-10));
  skipForwardBtn.addEventListener('click', () => skip(10));

  // ── Volume ──
  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon();
  });

  volumeSlider.addEventListener('input', () => {
    video.volume = parseFloat(volumeSlider.value);
    video.muted = false;
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

  // ── Speed ──
  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.toggle('active');
  });

  speedMenu.querySelectorAll('.speed-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const speed = parseFloat(option.dataset.speed);
      video.playbackRate = speed;
      currentSpeed = speed;
      speedBtn.textContent = speed === 1 ? '1x' : `${speed}x`;

      // Update active state
      speedMenu.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      speedMenu.classList.remove('active');
    });
  });

  // Close speed menu on outside click
  document.addEventListener('click', () => {
    speedMenu.classList.remove('active');
  });

  // ── Fullscreen ──
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapper.requestFullscreen();
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? '⛶' : '⛶';
  });

  // ── Picture-in-Picture ──
  pipBtn.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      showToast('ไม่รองรับ Picture-in-Picture', 'error');
    }
  });

  // ── Controls visibility ──
  function showControls() {
    wrapper.classList.add('controls-active');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!video.paused) {
        wrapper.classList.remove('controls-active');
      }
    }, 3000);
  }

  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('touchstart', showControls);

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    // Don't capture if typing in input
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
        e.preventDefault();
        {
          const idx = speeds.indexOf(currentSpeed);
          if (idx < speeds.length - 1) {
            const newSpeed = speeds[idx + 1];
            video.playbackRate = newSpeed;
            currentSpeed = newSpeed;
            speedBtn.textContent = newSpeed === 1 ? '1x' : `${newSpeed}x`;
            speedMenu.querySelectorAll('.speed-option').forEach(o => {
              o.classList.toggle('active', parseFloat(o.dataset.speed) === newSpeed);
            });
            showToast(`ความเร็ว ${newSpeed}x`, 'info');
          }
        }
        break;

      case '<':
        e.preventDefault();
        {
          const idx = speeds.indexOf(currentSpeed);
          if (idx > 0) {
            const newSpeed = speeds[idx - 1];
            video.playbackRate = newSpeed;
            currentSpeed = newSpeed;
            speedBtn.textContent = newSpeed === 1 ? '1x' : `${newSpeed}x`;
            speedMenu.querySelectorAll('.speed-option').forEach(o => {
              o.classList.toggle('active', parseFloat(o.dataset.speed) === newSpeed);
            });
            showToast(`ความเร็ว ${newSpeed}x`, 'info');
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        volumeSlider.value = video.volume;
        updateVolumeIcon();
        break;

      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        volumeSlider.value = video.volume;
        updateVolumeIcon();
        break;
    }
  });

  // ── Error handling ──
  video.addEventListener('error', () => {
    showToast('ไม่สามารถโหลดวีดีโอได้ กรุณาตรวจสอบว่าไฟล์ใน Google Drive ตั้ง sharing เป็น "Anyone with the link"', 'error');
  });
}
