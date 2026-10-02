class EtsukoPlayer {
  constructor() {
    this.audio = document.getElementById('audio-engine');
    this.currentTrack = null;
    this.queue = [];
    this.queueIndex = -1;
    this.recommendedTracks = [];
    this.playedTrackHistory = new Set();
    this.isExplicitQueue = false;
    this.isShuffle = false;
    this.repeatMode = 0; // 0: off, 1: all, 2: one
    this.volume = parseFloat(localStorage.getItem('etsuko_volume') || '0.75');
    this.isMuted = false;
    this.isPlaying = false;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;

    // Lyrics State
    this.currentLyrics = null;
    this.activeLyricIndex = -1;
    this.autoScrollLyrics = true;

    // Downloaded status cache
    this.downloadedVideoIds = new Set();

    this.initElements();
    this.initExpandedElements();
    this.initAudio();
    this.initListeners();
    this.initExpandedListeners();
    this.initMediaSession();
    this.loadDownloadedTracksCache();
  }

  initElements() {
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnShuffle = document.getElementById('btn-shuffle');
    this.shuffleDot = document.getElementById('shuffle-dot');
    this.btnRepeat = document.getElementById('btn-repeat');
    this.repeatDot = document.getElementById('repeat-dot');
    this.repeatBadge = document.getElementById('repeat-badge');
    this.coverSpinner = document.getElementById('cover-spinner');

    this.currentTimeLabel = document.getElementById('current-time');
    this.totalDurationLabel = document.getElementById('total-duration');
    this.scrubberBar = document.getElementById('timeline-scrubber');
    this.scrubberProgress = document.getElementById('timeline-progress');
    this.scrubberBuffered = document.getElementById('timeline-buffered');

    this.playerCoverBox = document.getElementById('player-cover-box');
    this.playerCover = document.getElementById('player-cover');
    this.playerTrackMeta = document.getElementById('player-track-meta');
    this.playerTitle = document.getElementById('player-title');
    this.playerArtist = document.getElementById('player-artist');
    this.playerLikeBtn = document.getElementById('player-like-btn');
    this.playerAddPlaylistBtn = document.getElementById('player-add-playlist-btn');
    this.btnExpandPlayer = document.getElementById('btn-expand-player');

    this.volumeScrubber = document.getElementById('volume-scrubber');
    this.volumeProgress = document.getElementById('volume-progress');
    this.btnVolumeIcon = document.getElementById('btn-volume-icon');
    this.iconVolHigh = document.getElementById('icon-vol-high');
    this.iconVolMute = document.getElementById('icon-vol-mute');

    this.canvasVisualizer = document.getElementById('audio-visualizer');
    if (this.canvasVisualizer) {
      this.canvasCtx = this.canvasVisualizer.getContext('2d');
    }
  }

  initExpandedElements() {
    this.expandedOverlay = document.getElementById('expanded-player-overlay');
    this.expandedBgArt = document.getElementById('expanded-bg-art');
    this.btnExpandedMinimize = document.getElementById('btn-expanded-minimize');
    this.expandedCoverImg = document.getElementById('expanded-cover-img');
    this.expandedTitle = document.getElementById('expanded-title');
    this.expandedArtist = document.getElementById('expanded-artist');
    this.expandedAlbum = document.getElementById('expanded-album');
    this.expandedLikeBtn = document.getElementById('expanded-like-btn');
    this.expandedDownloadBtn = document.getElementById('expanded-download-btn');
    this.expandedAddPlaylistBtn = document.getElementById('expanded-add-playlist-btn');

    this.expandedTimelineScrubber = document.getElementById('expanded-timeline-scrubber');
    this.expandedScrubberBuffered = document.getElementById('expanded-scrubber-buffered');
    this.expandedScrubberFill = document.getElementById('expanded-scrubber-fill');
    this.expandedCurrentTime = document.getElementById('expanded-current-time');
    this.expandedTotalDuration = document.getElementById('expanded-total-duration');

    this.expandedBtnShuffle = document.getElementById('expanded-btn-shuffle');
    this.expandedShuffleDot = document.getElementById('expanded-shuffle-dot');
    this.expandedBtnPrev = document.getElementById('expanded-btn-prev');
    this.expandedBtnPlayPause = document.getElementById('expanded-btn-play-pause');
    this.expandedIconPlay = document.getElementById('expanded-icon-play');
    this.expandedIconPause = document.getElementById('expanded-icon-pause');
    this.expandedBtnNext = document.getElementById('expanded-btn-next');
    this.expandedBtnRepeat = document.getElementById('expanded-btn-repeat');
    this.expandedRepeatBadge = document.getElementById('expanded-repeat-badge');
    this.expandedRepeatDot = document.getElementById('expanded-repeat-dot');

    this.expandedVolumeTrack = document.getElementById('expanded-volume-track');
    this.expandedVolumeFill = document.getElementById('expanded-volume-fill');

    // Right Column Tabs & Panels
    this.tabBtnLyrics = document.getElementById('tab-btn-lyrics');
    this.tabBtnQueue = document.getElementById('tab-btn-queue');
    this.tabBtnRecommended = document.getElementById('tab-btn-recommended');
    this.panelLyrics = document.getElementById('panel-lyrics');
    this.panelQueue = document.getElementById('panel-queue');
    this.panelRecommended = document.getElementById('panel-recommended');

    this.expandedLyricsContainer = document.getElementById('expanded-lyrics-container');
    this.expandedLyricsStatus = document.getElementById('expanded-lyrics-status');
    this.expandedLyricsFollowBtn = document.getElementById('expanded-lyrics-follow-btn');

    this.expandedQueueList = document.getElementById('expanded-queue-list');
    this.expandedQueueCount = document.getElementById('expanded-queue-count');
    this.expandedBtnClearQueue = document.getElementById('expanded-btn-clear-queue');

    this.expandedRecList = document.getElementById('expanded-rec-list');
    this.expandedRecVibeTag = document.getElementById('expanded-rec-vibe-tag');
  }

  async loadDownloadedTracksCache() {
    if (window.api && typeof window.api.getDownloadedTracks === 'function') {
      try {
        const list = await window.api.getDownloadedTracks();
        this.downloadedVideoIds = new Set(list.map(t => t.videoId));
        this.updateDownloadButtonState();
      } catch (e) {}
    }
  }

  initAudio() {
    this.audio.volume = this.volume;
    this.updateVolumeUI(this.volume);

    this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audio.addEventListener('progress', () => this.onProgress());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('play', () => this.onPlayStateChange(true));
    this.audio.addEventListener('pause', () => this.onPlayStateChange(false));
    this.audio.addEventListener('waiting', () => this.showSpinner(true));
    this.consecutiveFailures = 0;
    this.failureSkipTimer = null;
    this.userPaused = false;

    this.audio.addEventListener('playing', () => {
      this.showSpinner(false);
      this.consecutiveFailures = 0;
      if (this.failureSkipTimer) {
        clearTimeout(this.failureSkipTimer);
        this.failureSkipTimer = null;
      }
      this.initVisualizer();
    });

    this.audio.addEventListener('stalled', () => {
      if (this.isPlaying && this.audio.paused && !this.userPaused) {
        this.audio.play().catch(() => {});
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (this.isPlaying && this.audio.paused && !this.userPaused) {
          this.audio.play().catch(() => {});
        }
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[Etsuko] Audio error:', e);
      this.showSpinner(false);
      this.handlePlaybackFailure();
    });

    window.addEventListener('etsuko:track-like-changed', (e) => {
      const { videoId, isLiked } = e.detail || {};
      if (this.currentTrack && this.currentTrack.videoId === videoId) {
        this.currentTrack.isLiked = isLiked;
        this.updateLikeButtonState(isLiked);
      }
    });
  }

  initVisualizer() {
    if (this.audioContext || !this.canvasVisualizer) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.drawVisualizer();
    } catch (e) {
      console.log('[Etsuko] Visualizer skipped:', e);
    }
  }

  drawVisualizer() {
    requestAnimationFrame(() => this.drawVisualizer());
    if (!this.analyser || !this.isPlaying || !this.canvasVisualizer) {
      if (this.canvasCtx && this.canvasVisualizer) {
        this.canvasCtx.clearRect(0, 0, this.canvasVisualizer.width, this.canvasVisualizer.height);
      }
      return;
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    this.canvasCtx.clearRect(0, 0, this.canvasVisualizer.width, this.canvasVisualizer.height);

    const barWidth = 3;
    const gap = 2;
    let x = 0;
    const barCount = 14;

    for (let i = 0; i < barCount; i++) {
      const value = this.dataArray[i * 2] || 0;
      const percent = value / 255;
      const barHeight = Math.max(2, percent * this.canvasVisualizer.height);
      const y = this.canvasVisualizer.height - barHeight;

      const grad = this.canvasCtx.createLinearGradient(0, y, 0, this.canvasVisualizer.height);
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(1, '#8b5cf6');
      this.canvasCtx.fillStyle = grad;
      this.canvasCtx.fillRect(x, y, barWidth, barHeight);
      x += barWidth + gap;
    }
  }

  initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && this.audio.duration) {
          this.audio.currentTime = details.seekTime;
        }
      });
    }
  }

  initListeners() {
    this.btnPlayPause.addEventListener('click', () => this.togglePlay());
    this.btnPrev.addEventListener('click', () => this.prev());
    this.btnNext.addEventListener('click', () => this.next());

    this.btnShuffle.addEventListener('click', () => this.toggleShuffle());
    this.btnRepeat.addEventListener('click', () => this.cycleRepeat());

    // Timeline Scrubbing on Bottom Player
    this.setupScrubber(this.scrubberBar, (percentage) => {
      if (this.audio.duration) {
        this.audio.currentTime = percentage * this.audio.duration;
      }
    });

    // Volume Scrubbing on Bottom Player
    this.setupScrubber(this.volumeScrubber, (percentage) => {
      this.setVolume(percentage);
    });

    this.btnVolumeIcon.addEventListener('click', () => this.toggleMute());

    // Like button toggle on bottom player
    this.playerLikeBtn.addEventListener('click', () => this.toggleLikeCurrentTrack());

    // Add to playlist button
    if (this.playerAddPlaylistBtn) {
      this.playerAddPlaylistBtn.addEventListener('click', () => {
        if (this.currentTrack && window.app && window.app.openAddToPlaylistModal) {
          window.app.openAddToPlaylistModal(this.currentTrack);
        }
      });
    }

    // Open Expanded Player triggers
    if (this.playerCoverBox) {
      this.playerCoverBox.addEventListener('click', () => this.openExpandedPlayer());
    }
    if (this.playerTrackMeta) {
      this.playerTrackMeta.addEventListener('click', () => this.openExpandedPlayer());
    }
    if (this.btnExpandPlayer) {
      this.btnExpandPlayer.addEventListener('click', () => this.openExpandedPlayer());
    }

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        this.setVolume(Math.min(1, this.volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.setVolume(Math.max(0, this.volume - 0.05));
      } else if (e.code === 'KeyM') {
        this.toggleMute();
      } else if (e.code === 'Escape') {
        if (this.expandedOverlay && this.expandedOverlay.classList.contains('open')) {
          this.closeExpandedPlayer();
        }
      }
    });
  }

  initExpandedListeners() {
    if (!this.expandedOverlay) return;

    if (this.btnExpandedMinimize) {
      this.btnExpandedMinimize.addEventListener('click', () => this.closeExpandedPlayer());
    }

    if (this.expandedBtnPlayPause) {
      this.expandedBtnPlayPause.addEventListener('click', () => this.togglePlay());
    }
    if (this.expandedBtnPrev) {
      this.expandedBtnPrev.addEventListener('click', () => this.prev());
    }
    if (this.expandedBtnNext) {
      this.expandedBtnNext.addEventListener('click', () => this.next());
    }
    if (this.expandedBtnShuffle) {
      this.expandedBtnShuffle.addEventListener('click', () => this.toggleShuffle());
    }
    if (this.expandedBtnRepeat) {
      this.expandedBtnRepeat.addEventListener('click', () => this.cycleRepeat());
    }

    if (this.expandedLikeBtn) {
      this.expandedLikeBtn.addEventListener('click', () => this.toggleLikeCurrentTrack());
    }
    if (this.expandedDownloadBtn) {
      this.expandedDownloadBtn.addEventListener('click', () => this.downloadCurrentTrack());
    }
    if (this.expandedAddPlaylistBtn) {
      this.expandedAddPlaylistBtn.addEventListener('click', () => {
        if (this.currentTrack && window.app && window.app.openAddToPlaylistModal) {
          window.app.openAddToPlaylistModal(this.currentTrack);
        }
      });
    }

    // Scrubber in expanded player
    if (this.expandedTimelineScrubber) {
      this.setupScrubber(this.expandedTimelineScrubber, (percentage) => {
        if (this.audio.duration) {
          this.audio.currentTime = percentage * this.audio.duration;
        }
      });
    }

    // Volume in expanded player
    if (this.expandedVolumeTrack) {
      this.setupScrubber(this.expandedVolumeTrack, (percentage) => {
        this.setVolume(percentage);
      });
    }

    // Tabs switching
    const tabs = [
      { btn: this.tabBtnLyrics, panel: this.panelLyrics, id: 'lyrics' },
      { btn: this.tabBtnQueue, panel: this.panelQueue, id: 'queue' },
      { btn: this.tabBtnRecommended, panel: this.panelRecommended, id: 'recommended' }
    ];

    tabs.forEach(t => {
      if (t.btn && t.panel) {
        t.btn.addEventListener('click', () => {
          tabs.forEach(other => {
            if (other.btn) other.btn.classList.remove('active');
            if (other.panel) other.panel.classList.remove('active');
          });
          t.btn.classList.add('active');
          t.panel.classList.add('active');
        });
      }
    });

    // Follow lyrics auto-scroll button
    if (this.expandedLyricsFollowBtn) {
      this.expandedLyricsFollowBtn.addEventListener('click', () => {
        this.autoScrollLyrics = !this.autoScrollLyrics;
        this.expandedLyricsFollowBtn.classList.toggle('active', this.autoScrollLyrics);
        this.expandedLyricsFollowBtn.innerHTML = this.autoScrollLyrics ? '<span>● Auto-Scroll On</span>' : '<span>○ Manual</span>';
        if (this.autoScrollLyrics) this.syncLyricsScroll();
      });
    }

    // Clear queue button in expanded player
    if (this.expandedBtnClearQueue) {
      this.expandedBtnClearQueue.addEventListener('click', () => {
        this.clearUpcomingQueue();
      });
    }
  }

  setupScrubber(element, callback) {
    if (!element) return;
    let isDragging = false;
    const compute = (e) => {
      const rect = element.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      callback(percentage);
    };

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      compute(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) compute(e);
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  openExpandedPlayer() {
    if (!this.expandedOverlay) return;
    this.expandedOverlay.classList.add('open');
    this.updateExpandedTrackMeta();
    this.syncLyricsScroll();
    this.renderQueueUI();
    this.renderRecommendationsUI();
  }

  closeExpandedPlayer() {
    if (!this.expandedOverlay) return;
    this.expandedOverlay.classList.remove('open');
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    if (this.btnShuffle) {
      this.btnShuffle.classList.toggle('active', this.isShuffle);
      this.btnShuffle.title = this.isShuffle ? 'Shuffle: On' : 'Shuffle: Off';
    }
    if (this.expandedBtnShuffle) {
      this.expandedBtnShuffle.classList.toggle('active', this.isShuffle);
      this.expandedBtnShuffle.title = this.isShuffle ? 'Shuffle: On' : 'Shuffle: Off';
    }
    if (window.showToast) {
      window.showToast(this.isShuffle ? '🔀 Shuffle On' : '➡️ Shuffle Off');
    }
  }

  cycleRepeat() {
    this.repeatMode = (this.repeatMode + 1) % 3;
    const isOff = this.repeatMode === 0;
    const isAll = this.repeatMode === 1;
    const isOne = this.repeatMode === 2;

    if (this.btnRepeat) {
      this.btnRepeat.classList.toggle('active', !isOff);
      if (this.repeatBadge) this.repeatBadge.style.display = isOne ? 'flex' : 'none';
      this.btnRepeat.title = isOff ? 'Repeat: Off' : (isAll ? 'Repeat: All' : 'Repeat: One');
    }

    if (this.expandedBtnRepeat) {
      this.expandedBtnRepeat.classList.toggle('active', !isOff);
      if (this.expandedRepeatBadge) this.expandedRepeatBadge.style.display = isOne ? 'flex' : 'none';
      this.expandedBtnRepeat.title = isOff ? 'Repeat: Off' : (isAll ? 'Repeat: All' : 'Repeat: One');
    }

    if (window.showToast) {
      window.showToast(isOff ? '➡️ Repeat Off' : (isAll ? '🔁 Repeat All' : '🔂 Repeat One'));
    }
  }

  toggleMute() {
    if (this.isMuted) {
      this.isMuted = false;
      this.audio.volume = this.volume;
      this.updateVolumeUI(this.volume);
    } else {
      this.isMuted = true;
      this.audio.volume = 0;
      this.updateVolumeUI(0);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.isMuted = false;
    this.audio.volume = this.volume;
    localStorage.setItem('etsuko_volume', this.volume);
    this.updateVolumeUI(this.volume);
  }

  updateVolumeUI(val) {
    const pct = `${val * 100}%`;
    if (this.volumeProgress) this.volumeProgress.style.width = pct;
    if (this.expandedVolumeFill) this.expandedVolumeFill.style.width = pct;

    if (val === 0 || this.isMuted) {
      if (this.iconVolHigh) this.iconVolHigh.style.display = 'none';
      if (this.iconVolMute) this.iconVolMute.style.display = 'block';
    } else {
      if (this.iconVolHigh) this.iconVolHigh.style.display = 'block';
      if (this.iconVolMute) this.iconVolMute.style.display = 'none';
    }
  }

  showSpinner(show) {
    if (this.coverSpinner) this.coverSpinner.style.display = show ? 'block' : 'none';
  }

  async playTrack(track, queueList = null) {
    if (!track || !track.videoId) return;

    this.currentTrack = track;
    this.playedTrackHistory.add(track.videoId);

    if (queueList && Array.isArray(queueList) && queueList.length > 0) {
      this.isExplicitQueue = true;
      this.queue = [...queueList];
      this.queueIndex = this.queue.findIndex(t => t.videoId === track.videoId);
      if (this.queueIndex === -1) {
        this.queue.unshift(track);
        this.queueIndex = 0;
      }
    } else {
      this.isExplicitQueue = false;
      this.recommendedTracks = this.recommendedTracks.filter(t => t.videoId !== track.videoId);
      this.queue = [track, ...this.recommendedTracks];
      this.queueIndex = 0;
    }

    // Update Bottom & Expanded Metas
    this.updateTrackMetaUI(track);
    this.updateExpandedTrackMeta();
    this.showSpinner(true);
    this.updateActiveTrackHighlight();

    // MediaSession Metadata
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Etsuko Music',
        artwork: [
          { src: track.thumbnail || 'assets/default_cover.png', sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    }

    // Record History in DB
    fetch('/api/library/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track)
    }).catch(() => {});

    // Stream Audio through local proxy (supports instant offline serving if downloaded)
    try {
      this.userPaused = false;
      this.audio.src = `/api/proxy_stream/${encodeURIComponent(track.videoId)}`;
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      await this.audio.play();
      this.consecutiveFailures = 0;
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.code === 20)) return;
      console.warn('[Etsuko] Play delayed, retrying...', e);
      try {
        await new Promise(r => setTimeout(r, 400));
        await this.audio.play();
        this.consecutiveFailures = 0;
      } catch (err2) {
        if (err2 && (err2.name === 'AbortError' || err2.code === 20)) return;
        console.error('[Etsuko] Stream error:', err2);
        this.handlePlaybackFailure();
      }
    }

    // Fetch Lyrics & Recommendations in parallel
    this.loadLyrics(track);
    this.loadRecommendations(track);
    this.checkTrackDownloadStatus(track);

    window.dispatchEvent(new CustomEvent('etsuko:track-started', { detail: track }));
    this.renderQueueUI();
  }

  updateTrackMetaUI(track) {
    const thumb = track.thumbnail || 'assets/default_cover.png';
    if (this.playerCover) {
      this.playerCover.src = thumb;
      this.playerCover.onerror = () => { this.playerCover.src = 'assets/default_cover.png'; };
    }
    if (this.playerTitle) this.playerTitle.textContent = track.title || 'Unknown Title';
    if (this.playerArtist) this.playerArtist.textContent = track.artist || 'Unknown Artist';
    this.updateLikeButtonState(!!track.isLiked);
  }

  updateExpandedTrackMeta() {
    if (!this.currentTrack) return;
    const track = this.currentTrack;
    const thumb = track.thumbnail || 'assets/default_cover.png';

    if (this.expandedBgArt) {
      this.expandedBgArt.style.backgroundImage = `url(${thumb})`;
    }
    if (this.expandedCoverImg) {
      this.expandedCoverImg.src = thumb;
      this.expandedCoverImg.onerror = () => { this.expandedCoverImg.src = 'assets/default_cover.png'; };
    }
    if (this.expandedTitle) this.expandedTitle.textContent = track.title || 'Unknown Title';
    if (this.expandedArtist) this.expandedArtist.textContent = track.artist || 'Unknown Artist';
    if (this.expandedAlbum) this.expandedAlbum.textContent = track.album || 'Master Audio Quality';

    this.updateLikeButtonState(!!track.isLiked);
    this.updateDownloadButtonState();
  }

  updateLikeButtonState(isLiked) {
    if (this.playerLikeBtn) {
      this.playerLikeBtn.classList.toggle('liked', isLiked);
      const svg = this.playerLikeBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isLiked ? '#ec4899' : 'none');
    }
    if (this.expandedLikeBtn) {
      this.expandedLikeBtn.classList.toggle('liked', isLiked);
      const svg = this.expandedLikeBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isLiked ? '#ec4899' : 'none');
    }
  }

  updateDownloadButtonState() {
    if (!this.currentTrack || !this.expandedDownloadBtn) return;
    const isDl = this.downloadedVideoIds.has(this.currentTrack.videoId);
    this.expandedDownloadBtn.classList.toggle('downloaded', isDl);
    this.expandedDownloadBtn.title = isDl ? 'Downloaded for Offline Playback' : 'Download for Offline Playback';
    const svg = this.expandedDownloadBtn.querySelector('svg');
    if (svg) {
      if (isDl) {
        svg.innerHTML = '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
      } else {
        svg.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>';
      }
    }
  }

  async checkTrackDownloadStatus(track) {
    if (!track || !track.videoId || !window.api) return;
    try {
      const isDl = await window.api.checkDownloadStatus(track.videoId);
      if (isDl) {
        this.downloadedVideoIds.add(track.videoId);
      } else {
        this.downloadedVideoIds.delete(track.videoId);
      }
      this.updateDownloadButtonState();
    } catch (e) {}
  }

  async downloadCurrentTrack() {
    if (!this.currentTrack || !window.api) return;
    const track = this.currentTrack;
    if (this.downloadedVideoIds.has(track.videoId)) {
      if (window.showToast) window.showToast(`"${track.title}" is already stored offline.`);
      return;
    }

    if (window.showToast) window.showToast(`Saving "${track.title}" for offline playback...`);
    try {
      const res = await window.api.downloadTrack(track);
      if (res && res.success) {
        this.downloadedVideoIds.add(track.videoId);
        this.updateDownloadButtonState();
        if (window.showToast) window.showToast(`Downloaded "${track.title}" successfully!`);
        window.dispatchEvent(new CustomEvent('etsuko:downloads-updated'));
      }
    } catch (e) {
      if (window.showToast) window.showToast('Download error. Please retry.');
    }
  }

  async toggleLikeCurrentTrack() {
    if (!this.currentTrack) return;
    const track = this.currentTrack;
    const currentlyLiked = !!track.isLiked;

    if (currentlyLiked) {
      try {
        await fetch('/api/library/unlike', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: track.videoId })
        });
        track.isLiked = false;
        this.updateLikeButtonState(false);
        if (window.showToast) window.showToast('Removed from Liked Songs');
        window.dispatchEvent(new CustomEvent('etsuko:library-updated'));
        window.dispatchEvent(new CustomEvent('etsuko:track-like-changed', {
          detail: { videoId: track.videoId, isLiked: false }
        }));
      } catch (e) {
        console.error('Unlike failed:', e);
      }
    } else {
      try {
        await fetch('/api/library/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(track)
        });
        track.isLiked = true;
        this.updateLikeButtonState(true);
        if (window.showToast) window.showToast('Added to Liked Songs');
        window.dispatchEvent(new CustomEvent('etsuko:library-updated'));
        window.dispatchEvent(new CustomEvent('etsuko:track-like-changed', {
          detail: { videoId: track.videoId, isLiked: true }
        }));
      } catch (e) {
        console.error('Like failed:', e);
      }
    }
  }

  // --- Recommendation Engine (Single Source of Truth) ---
  async loadRecommendations(track) {
    if (!track || !window.api) return;
    try {
      const recData = await window.api.getRelatedTracks(track);
      const fresh = recData.tracks || [];

      // Update vibe tag
      if (this.expandedRecVibeTag) {
        this.expandedRecVibeTag.textContent = `${recData.displayTag} · Based on ${track.title}`;
      }

      this.recommendedTracks = fresh;
      if (!this.isExplicitQueue) {
        this.queue = [track, ...this.recommendedTracks];
        this.queueIndex = 0;
      }

      this.renderRecommendationsUI();
      this.renderQueueUI();
    } catch (e) {
      console.warn('[Player] loadRecommendations error:', e);
    }
  }

  async replenishRecommendations(currentTrack) {
    if (!window.api || !currentTrack) return;
    try {
      const recData = await window.api.getRelatedTracks(currentTrack);
      const candidates = (recData.tracks || []).filter(t =>
        !this.playedTrackHistory.has(t.videoId) &&
        !this.recommendedTracks.some(r => r.videoId === t.videoId)
      );
      if (candidates.length > 0) {
        this.recommendedTracks.push(...candidates);
        if (!this.isExplicitQueue) {
          this.queue = [this.currentTrack, ...this.recommendedTracks];
        }
        this.renderRecommendationsUI();
        this.renderQueueUI();
      }
    } catch (e) {}
  }

  async triggerAutoplayFromRecommendations() {
    if (this.recommendedTracks && this.recommendedTracks.length > 0) {
      let nextTrack = null;
      if (this.isShuffle) {
        const randIdx = Math.floor(Math.random() * this.recommendedTracks.length);
        nextTrack = this.recommendedTracks.splice(randIdx, 1)[0];
      } else {
        nextTrack = this.recommendedTracks.shift();
      }

      if (nextTrack) {
        this.playedTrackHistory.add(nextTrack.videoId);
        this.queue = [nextTrack, ...this.recommendedTracks];
        this.queueIndex = 0;
        this.isExplicitQueue = false;
        this.playTrack(nextTrack);

        if (this.recommendedTracks.length < 5) {
          this.replenishRecommendations(nextTrack);
        }
        return;
      }
    }

    // If pool empty, try to fetch new recommendations
    if (this.currentTrack && window.api) {
      try {
        const recData = await window.api.getRelatedTracks(this.currentTrack);
        const fresh = recData.tracks || [];
        if (fresh.length > 0) {
          this.recommendedTracks = fresh;
          const nextTrack = this.recommendedTracks.shift();
          this.playedTrackHistory.add(nextTrack.videoId);
          this.queue = [nextTrack, ...this.recommendedTracks];
          this.queueIndex = 0;
          this.isExplicitQueue = false;
          this.playTrack(nextTrack);
        }
      } catch (e) {}
    }
  }

  clearUpcomingQueue() {
    this.recommendedTracks = [];
    this.queue = this.currentTrack ? [this.currentTrack] : [];
    this.queueIndex = 0;
    this.renderQueueUI();
    this.renderRecommendationsUI();
    if (window.showToast) window.showToast('Upcoming queue cleared.');
  }

  // --- Lyrics Subsystem ---
  async loadLyrics(track) {
    if (!this.expandedLyricsContainer) return;
    this.expandedLyricsContainer.innerHTML = '<div class="lyrics-placeholder">Searching studio lyrics...</div>';
    if (this.expandedLyricsStatus) this.expandedLyricsStatus.textContent = 'SEARCHING';

    try {
      const res = await window.api.getLyrics(track.title, track.artist);
      this.currentLyrics = res;
      this.activeLyricIndex = -1;

      if (res.type === 'synced' && res.lines && res.lines.length > 0) {
        if (this.expandedLyricsStatus) this.expandedLyricsStatus.textContent = 'SYNCHRONIZED';
        this.renderSyncedLyrics(res.lines);
      } else if (res.type === 'plain' && res.text) {
        if (this.expandedLyricsStatus) this.expandedLyricsStatus.textContent = 'PLAIN LYRICS';
        this.renderPlainLyrics(res.text);
      } else if (res.type === 'instrumental') {
        if (this.expandedLyricsStatus) this.expandedLyricsStatus.textContent = 'INSTRUMENTAL';
        this.expandedLyricsContainer.innerHTML = '<div class="lyrics-placeholder">🎵 Instrumental track • Enjoy the music</div>';
      } else {
        if (this.expandedLyricsStatus) this.expandedLyricsStatus.textContent = 'UNAVAILABLE';
        this.expandedLyricsContainer.innerHTML = '<div class="lyrics-placeholder">Lyrics not available for this track.</div>';
      }
    } catch (e) {
      if (this.expandedLyricsStatus) this.expandedLyricsStatus.textContent = 'UNAVAILABLE';
      this.expandedLyricsContainer.innerHTML = '<div class="lyrics-placeholder">Unable to load lyrics.</div>';
    }
  }

  renderSyncedLyrics(lines) {
    this.expandedLyricsContainer.innerHTML = '';
    lines.forEach((line, idx) => {
      const p = document.createElement('div');
      p.className = 'expanded-lyrics-line';
      p.setAttribute('data-index', idx);
      p.setAttribute('data-time', line.time);
      p.textContent = line.text;
      p.onclick = () => {
        this.audio.currentTime = line.time;
        if (this.audio.paused) this.audio.play();
      };
      this.expandedLyricsContainer.appendChild(p);
    });
  }

  renderPlainLyrics(text) {
    this.expandedLyricsContainer.innerHTML = '';
    const lines = text.split('\n');
    lines.forEach(l => {
      const p = document.createElement('div');
      p.className = 'expanded-lyrics-line';
      p.style.cursor = 'default';
      p.textContent = l || ' ';
      this.expandedLyricsContainer.appendChild(p);
    });
  }

  syncLyricsScroll() {
    if (!this.currentLyrics || this.currentLyrics.type !== 'synced') return;
    const currentTime = this.audio.currentTime || 0;
    const lines = this.currentLyrics.lines || [];
    let activeIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== this.activeLyricIndex) {
      this.activeLyricIndex = activeIdx;
      const allLineEls = this.expandedLyricsContainer.querySelectorAll('.expanded-lyrics-line');
      allLineEls.forEach((el, i) => {
        if (i === activeIdx) {
          el.classList.add('active');
          if (this.autoScrollLyrics && this.expandedOverlay && this.expandedOverlay.classList.contains('open')) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          el.classList.remove('active');
        }
      });
    }
  }

  // --- Render Queue & Recommendations UI ---
  renderQueueUI() {
    // 1. Expanded Player Queue
    if (this.expandedQueueList) {
      this.expandedQueueList.innerHTML = '';
      const upcoming = this.queue.slice(this.queueIndex + 1);
      if (this.expandedQueueCount) {
        this.expandedQueueCount.textContent = `${upcoming.length} tracks`;
      }

      if (upcoming.length === 0) {
        this.expandedQueueList.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:32px;">No upcoming tracks. Autoplay will generate recommendations.</div>';
      } else {
        upcoming.forEach((t, i) => {
          const card = document.createElement('div');
          card.className = 'expanded-track-card';
          card.innerHTML = `
            <div class="expanded-track-card-left">
              <img class="expanded-card-thumb" src="${t.thumbnail || 'assets/default_cover.png'}" onerror="this.src='assets/default_cover.png'">
              <div class="expanded-card-info">
                <div class="expanded-card-title">${t.title}</div>
                <div class="expanded-card-artist">${t.artist}</div>
              </div>
            </div>
            <div class="expanded-track-card-right">
              <span class="expanded-card-duration">${t.duration || '3:30'}</span>
              <button class="btn-card-icon btn-card-remove" title="Remove from Queue">&times;</button>
            </div>
          `;

          card.onclick = (e) => {
            if (e.target.closest('.btn-card-remove')) return;
            this.queueIndex = this.queueIndex + 1 + i;
            this.playTrack(t);
          };

          const removeBtn = card.querySelector('.btn-card-remove');
          if (removeBtn) {
            removeBtn.onclick = (e) => {
              e.stopPropagation();
              const realIdx = this.queueIndex + 1 + i;
              this.queue.splice(realIdx, 1);
              this.recommendedTracks = this.recommendedTracks.filter(rt => rt.videoId !== t.videoId);
              this.renderQueueUI();
            };
          }

          this.expandedQueueList.appendChild(card);
        });
      }
    }

    // 2. Sync Desktop Sidebar Queue Drawer if open
    window.dispatchEvent(new CustomEvent('etsuko:queue-updated'));
  }

  renderRecommendationsUI() {
    if (!this.expandedRecList) return;
    this.expandedRecList.innerHTML = '';
    const recs = this.recommendedTracks || [];

    if (recs.length === 0) {
      this.expandedRecList.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:32px;">Generating vibe recommendations...</div>';
      return;
    }

    recs.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'expanded-track-card';
      card.innerHTML = `
        <div class="expanded-track-card-left">
          <img class="expanded-card-thumb" src="${t.thumbnail || 'assets/default_cover.png'}" onerror="this.src='assets/default_cover.png'">
          <div class="expanded-card-info">
            <div class="expanded-card-title">${t.title}</div>
            <div class="expanded-card-artist">${t.artist}</div>
          </div>
        </div>
        <div class="expanded-track-card-right">
          <span class="expanded-card-duration">${t.duration || '3:30'}</span>
          <button class="btn-card-icon btn-card-play" title="Play Track">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </button>
        </div>
      `;

      card.onclick = () => {
        this.recommendedTracks = this.recommendedTracks.filter(item => item.videoId !== t.videoId);
        this.queue = [t, ...this.recommendedTracks];
        this.queueIndex = 0;
        this.isExplicitQueue = false;
        this.playTrack(t);
      };

      this.expandedRecList.appendChild(card);
    });
  }

  handlePlaybackFailure() {
    this.showSpinner(false);
    if (this.failureSkipTimer) {
      clearTimeout(this.failureSkipTimer);
      this.failureSkipTimer = null;
    }
    this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
    const title = this.currentTrack ? this.currentTrack.title : 'this track';

    if (this.consecutiveFailures >= 3) {
      if (window.showToast) {
        window.showToast('Multiple tracks failed to stream. Playback paused.');
      }
      this.consecutiveFailures = 0;
      this.isPlaying = false;
      this.onPlayStateChange(false);
      return;
    }

    if (window.showToast) {
      window.showToast(`Unable to stream "${title}". Skipping to next...`);
    }
    this.failureSkipTimer = setTimeout(() => {
      this.next();
    }, 1600);
  }

  togglePlay() {
    if (!this.audio.src || !this.currentTrack) {
      if (this.queue.length > 0) {
        this.playTrack(this.queue[0]);
      }
      return;
    }
    if (this.audio.paused) {
      this.userPaused = false;
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audio.play();
    } else {
      this.userPaused = true;
      this.audio.pause();
    }
  }

  onPlayStateChange(playing) {
    this.isPlaying = playing;
    if (this.iconPlay) this.iconPlay.style.display = playing ? 'none' : 'block';
    if (this.iconPause) this.iconPause.style.display = playing ? 'block' : 'none';

    if (this.expandedIconPlay) this.expandedIconPlay.style.display = playing ? 'none' : 'block';
    if (this.expandedIconPause) this.expandedIconPause.style.display = playing ? 'block' : 'none';

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  next() {
    if (this.queue.length === 0 && (!this.recommendedTracks || this.recommendedTracks.length === 0)) return;

    if (this.isShuffle) {
      const remainingUpcoming = this.queue.slice(this.queueIndex + 1);
      if (remainingUpcoming.length > 0) {
        const rand = Math.floor(Math.random() * remainingUpcoming.length);
        this.queueIndex = this.queueIndex + 1 + rand;
        this.playTrack(this.queue[this.queueIndex]);
        return;
      }
    }

    if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex++;
      this.playTrack(this.queue[this.queueIndex]);
    } else {
      // Smart Autoplay from single source of truth
      this.triggerAutoplayFromRecommendations();
    }
  }

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    if (this.queueIndex > 0) {
      this.queueIndex--;
      this.playTrack(this.queue[this.queueIndex]);
    } else {
      this.audio.currentTime = 0;
    }
  }

  onEnded() {
    if (this.repeatMode === 2) {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.next();
    }
  }

  onTimeUpdate() {
    if (!this.audio.duration) return;
    const current = this.audio.currentTime;
    const duration = this.audio.duration;
    const percent = (current / duration) * 100;

    // Bottom Player Scrubber
    if (this.scrubberProgress) this.scrubberProgress.style.width = `${percent}%`;
    if (this.currentTimeLabel) this.currentTimeLabel.textContent = this.formatTime(current);
    if (this.totalDurationLabel) this.totalDurationLabel.textContent = this.formatTime(duration);

    // Expanded Player Scrubber
    if (this.expandedScrubberFill) this.expandedScrubberFill.style.width = `${percent}%`;
    if (this.expandedCurrentTime) this.expandedCurrentTime.textContent = this.formatTime(current);
    if (this.expandedTotalDuration) this.expandedTotalDuration.textContent = this.formatTime(duration);

    // Sync active lyric line
    this.syncLyricsScroll();

    window.dispatchEvent(new CustomEvent('etsuko:time-update', {
      detail: { currentTime: current, duration: duration }
    }));
  }

  onProgress() {
    if (this.audio.buffered.length > 0 && this.audio.duration) {
      const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
      const percent = (bufferedEnd / this.audio.duration) * 100;
      if (this.scrubberBuffered) this.scrubberBuffered.style.width = `${percent}%`;
      if (this.expandedScrubberBuffered) this.expandedScrubberBuffered.style.width = `${percent}%`;
    }
  }

  formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  updateActiveTrackHighlight() {
    document.querySelectorAll('.track-row').forEach(row => {
      const vid = row.getAttribute('data-videoid');
      if (this.currentTrack && vid === this.currentTrack.videoId) {
        row.classList.add('playing');
      } else {
        row.classList.remove('playing');
      }
    });
  }
}

window.player = new EtsukoPlayer();
