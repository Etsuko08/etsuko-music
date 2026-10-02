// Etsuko PC Neural Audio Engine & Unified Player
// Intelligent Queue, Synced Dissolve Lyrics, Zero Letterbox Artwork & True Fullscreen Experience

class EtsukoPlayer {
  constructor() {
    this.audio = document.getElementById('audio-engine');
    this.currentTrack = null;
    this.queue = [];              // Upcoming tracks
    this.playedHistory = [];       // Previously played tracks for back/prev
    this.isExplicitQueue = false;  // Whether playing a fixed playlist/album
    this.isShuffle = false;
    this.repeatMode = 0;          // 0: off, 1: all, 2: one
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

    // Request Tokens & Concurrency Guards
    this.currentPlayToken = 0;
    this.isFetchingRecommendations = false;
    this.consecutiveFailures = 0;

    this.initElements();
    this.initExpandedElements();
    this.initAudio();
    this.initListeners();
    this.initExpandedListeners();
    this.initMediaSession();
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

  initAudio() {
    this.audio.volume = this.volume;
    this.updateVolumeUI(this.volume);

    this.audio.addEventListener('play', () => this.onPlayStateChange(true));
    this.audio.addEventListener('pause', () => this.onPlayStateChange(false));
    this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('waiting', () => this.showSpinner(true));
    this.audio.addEventListener('playing', () => this.showSpinner(false));
    this.audio.addEventListener('canplay', () => this.showSpinner(false));
    this.audio.addEventListener('progress', () => this.updateBufferProgress());
    this.audio.addEventListener('error', (e) => this.handleAudioError(e));

    // Web Audio Visualizer API Setup
    const setupAudioContext = () => {
      if (!this.audioContext) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContext();
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          const source = this.audioContext.createMediaElementSource(this.audio);
          source.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
          this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          this.renderVisualizer();
        } catch (e) {
          console.warn('[Etsuko] Web Audio visualizer not available:', e);
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    };
    window.addEventListener('click', setupAudioContext, { once: true });
    window.addEventListener('keydown', setupAudioContext, { once: true });
  }

  fitCoverImage(img) {
    if (!img) return;
    const check = () => {
      // Auto-detect YouTube letterbox 480x360 or URL signature and apply scale
      if ((img.naturalWidth === 480 && img.naturalHeight === 360) ||
          (img.src && img.src.includes('hqdefault.jpg'))) {
        img.classList.add('crop-letterbox');
      } else {
        img.classList.remove('crop-letterbox');
      }
    };
    if (img.complete && img.naturalWidth > 0) {
      check();
    } else {
      img.onload = check;
    }
    img.onerror = () => {
      if (img.src && img.src.includes('hq720.jpg')) {
        const vidMatch = img.src.match(/\/vi\/([^/]+)\//);
        if (vidMatch && vidMatch[1]) {
          img.src = `https://i.ytimg.com/vi/${vidMatch[1]}/mqdefault.jpg`;
          return;
        }
      }
      img.src = 'assets/default_cover.png';
    };
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

    if (this.expandedAddPlaylistBtn) {
      this.expandedAddPlaylistBtn.addEventListener('click', () => {
        if (this.currentTrack && window.app && window.app.openAddToPlaylistModal) {
          window.app.openAddToPlaylistModal(this.currentTrack);
        }
      });
    }

    // Expanded Timeline Scrubber
    this.setupScrubber(this.expandedTimelineScrubber, (percentage) => {
      if (this.audio.duration) {
        this.audio.currentTime = percentage * this.audio.duration;
      }
    });

    // Expanded Volume Slider
    this.setupScrubber(this.expandedVolumeTrack, (percentage) => {
      this.setVolume(percentage);
    });

    // Right Column Tabs
    if (this.tabBtnLyrics) {
      this.tabBtnLyrics.addEventListener('click', () => this.switchExpandedTab('lyrics'));
    }
    if (this.tabBtnQueue) {
      this.tabBtnQueue.addEventListener('click', () => this.switchExpandedTab('queue'));
    }
    if (this.tabBtnRecommended) {
      this.tabBtnRecommended.addEventListener('click', () => this.switchExpandedTab('recommended'));
    }

    // Auto-Scroll Toggle for Lyrics
    if (this.expandedLyricsFollowBtn) {
      this.expandedLyricsFollowBtn.addEventListener('click', () => {
        this.autoScrollLyrics = !this.autoScrollLyrics;
        this.expandedLyricsFollowBtn.classList.toggle('active', this.autoScrollLyrics);
        this.expandedLyricsFollowBtn.textContent = this.autoScrollLyrics ? '• Auto-Scroll On' : 'Auto-Scroll Off';
        if (this.autoScrollLyrics) this.syncLyricsScroll(true);
      });
    }

    // Clear Upcoming Queue
    if (this.expandedBtnClearQueue) {
      this.expandedBtnClearQueue.addEventListener('click', () => this.clearUpcomingQueue());
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

  // --- Expanded Player Modal Navigation ---
  openExpandedPlayer() {
    if (!this.expandedOverlay) return;
    this.expandedOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.updateExpandedTrackMeta();
    this.syncLyricsScroll(true);
    this.renderQueueUI();
  }

  closeExpandedPlayer() {
    if (!this.expandedOverlay) return;
    this.expandedOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  switchExpandedTab(tabName) {
    const tabs = [
      { name: 'lyrics', btn: this.tabBtnLyrics, panel: this.panelLyrics },
      { name: 'queue', btn: this.tabBtnQueue, panel: this.panelQueue },
      { name: 'recommended', btn: this.tabBtnRecommended, panel: this.panelRecommended }
    ];

    tabs.forEach(t => {
      if (t.btn) t.btn.classList.toggle('active', t.name === tabName);
      if (t.panel) t.panel.classList.toggle('active', t.name === tabName);
    });

    if (tabName === 'lyrics') {
      this.syncLyricsScroll(true);
    } else if (tabName === 'queue') {
      this.renderQueueUI();
    } else if (tabName === 'recommended') {
      this.renderRecommendationsUI();
    }
  }

  // --- Scrubber Helper ---
  setupScrubber(element, callback) {
    if (!element) return;
    let isDragging = false;

    const handleScrub = (e) => {
      const rect = element.getBoundingClientRect();
      let clickX = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX)) - rect.left;
      let pct = Math.max(0, Math.min(1, clickX / rect.width));
      callback(pct);
    };

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      handleScrub(e);
      const onMouseMove = (ev) => {
        if (isDragging) handleScrub(ev);
      };
      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    element.addEventListener('touchstart', (e) => {
      isDragging = true;
      handleScrub(e);
      const onTouchMove = (ev) => {
        if (isDragging) handleScrub(ev);
      };
      const onTouchEnd = () => {
        isDragging = false;
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }, { passive: true });
  }

  // --- Core Track Playback ---
  async playTrack(track, queueList = null, isNavigating = false) {
    if (!track || !track.videoId) return;

    const playToken = ++this.currentPlayToken;

    if (queueList && Array.isArray(queueList) && queueList.length > 0) {
      // User launched an explicit playlist/album
      this.isExplicitQueue = true;
      const idx = queueList.findIndex(t => t.videoId === track.videoId);
      if (idx !== -1) {
        this.playedHistory = queueList.slice(0, idx);
        this.queue = queueList.slice(idx + 1);
      } else {
        this.queue = queueList.filter(t => t.videoId !== track.videoId);
        this.playedHistory = [];
      }
      this.currentTrack = track;
    } else if (!isNavigating) {
      // User clicked a brand new seed track from Search or Home
      this.isExplicitQueue = false;
      this.playedHistory = [];
      this.queue = this.queue.filter(t => t.videoId !== track.videoId);
      this.currentTrack = track;
      this.loadRecommendations(track, playToken);
    } else {
      // Navigating (next / prev) within existing queue: preserve queue & history
      this.currentTrack = track;
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

    // Stream Audio through local proxy
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

    // Fetch Lyrics in parallel
    this.loadLyrics(track);

    window.dispatchEvent(new CustomEvent('etsuko:track-started', { detail: track }));
    this.renderQueueUI();
  }

  updateTrackMetaUI(track) {
    const thumb = track.thumbnail || 'assets/default_cover.png';
    if (this.playerCover) {
      this.playerCover.src = thumb;
      this.fitCoverImage(this.playerCover);
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
      this.fitCoverImage(this.expandedCoverImg);
    }
    if (this.expandedTitle) this.expandedTitle.textContent = track.title || 'Unknown Title';
    if (this.expandedArtist) this.expandedArtist.textContent = track.artist || 'Unknown Artist';
    if (this.expandedAlbum) this.expandedAlbum.textContent = track.album || 'Master Audio Quality';

    this.updateLikeButtonState(!!track.isLiked);
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
  async loadRecommendations(track, token = null) {
    if (!track || !window.api) return;
    this.isFetchingRecommendations = true;
    try {
      const recData = await window.api.getRelatedTracks(track);
      if (token && token !== this.currentPlayToken) return;

      const fresh = (recData.tracks || []).filter(t => t.videoId !== track.videoId);

      if (this.expandedRecVibeTag) {
        this.expandedRecVibeTag.textContent = `${recData.displayTag || 'VIBE'} · Based on ${track.title}`;
      }

      this.recommendedPool = fresh;
      if (!this.isExplicitQueue) {
        this.queue = [...fresh];
      }

      this.renderRecommendationsUI();
      this.renderQueueUI();
    } catch (e) {
      console.warn('[Player] loadRecommendations error:', e);
    } finally {
      this.isFetchingRecommendations = false;
    }
  }

  async replenishRecommendations(currentTrack, playImmediately = false) {
    if (!window.api || !currentTrack || this.isFetchingRecommendations) return;
    this.isFetchingRecommendations = true;
    try {
      const recData = await window.api.getRelatedTracks(currentTrack);
      const candidates = (recData.tracks || []).filter(t =>
        t.videoId !== (this.currentTrack ? this.currentTrack.videoId : '') &&
        !this.playedHistory.some(p => p.videoId === t.videoId) &&
        !this.queue.some(q => q.videoId === t.videoId)
      );

      if (candidates.length > 0) {
        this.queue.push(...candidates);
        this.renderQueueUI();
        this.renderRecommendationsUI();

        if (playImmediately && (!this.currentTrack || this.audio.paused)) {
          this.next();
        }
      }
    } catch (e) {
    } finally {
      this.isFetchingRecommendations = false;
    }
  }

  clearUpcomingQueue() {
    this.queue = [];
    this.renderQueueUI();
    this.renderRecommendationsUI();
    if (window.showToast) window.showToast('Upcoming queue cleared.');
  }

  // --- Lyrics Subsystem (Old-Line Dissolve Engine) ---
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
      p.className = 'expanded-lyrics-line upcoming';
      p.setAttribute('data-index', idx);
      p.setAttribute('data-time', line.time);
      p.textContent = line.text;
      p.onclick = () => {
        this.audio.currentTime = line.time;
        if (this.audio.paused) this.audio.play();
        this.syncLyricsScroll(true);
      };
      this.expandedLyricsContainer.appendChild(p);
    });
    this.syncLyricsScroll(true);
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

  syncLyricsScroll(force = false) {
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

    if (activeIdx !== this.activeLyricIndex || force) {
      this.activeLyricIndex = activeIdx;
      const allLineEls = this.expandedLyricsContainer.querySelectorAll('.expanded-lyrics-line');

      allLineEls.forEach((el, i) => {
        if (activeIdx === -1) {
          el.classList.remove('passed', 'active');
          el.classList.add('upcoming');
        } else if (i < activeIdx) {
          // Past line: dissolves and collapses so the singing line is ALWAYS on top!
          el.classList.add('passed');
          el.classList.remove('active', 'upcoming');
        } else if (i === activeIdx) {
          // Active singing line: vibrant, prominent, positioned right at top
          el.classList.add('active');
          el.classList.remove('passed', 'upcoming');
        } else {
          // Upcoming lines below active line
          el.classList.add('upcoming');
          el.classList.remove('passed', 'active');
        }
      });

      // Keep singing line pinned right at the top
      if (this.autoScrollLyrics && this.expandedOverlay && this.expandedOverlay.classList.contains('open')) {
        this.expandedLyricsContainer.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  }

  // --- Render Queue & Recommendations UI ---
  renderQueueUI() {
    // 1. Expanded Player Queue List
    if (this.expandedQueueList) {
      this.expandedQueueList.innerHTML = '';
      const upcoming = this.queue || [];
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
              <div class="expanded-card-thumb-wrap">
                <img class="expanded-card-thumb" src="${t.thumbnail || 'assets/default_cover.png'}">
              </div>
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

          const img = card.querySelector('img');
          this.fitCoverImage(img);

          card.onclick = (e) => {
            if (e.target.closest('.btn-card-remove')) return;
            // Move preceding tracks in queue to history
            const skipped = this.queue.splice(0, i);
            if (this.currentTrack) skipped.unshift(this.currentTrack);
            this.playedHistory.push(...skipped);
            const nextTrack = this.queue.shift();
            this.playTrack(nextTrack, null, true);
          };

          const removeBtn = card.querySelector('.btn-card-remove');
          if (removeBtn) {
            removeBtn.onclick = (e) => {
              e.stopPropagation();
              this.queue.splice(i, 1);
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
    const recs = (this.recommendedPool || []).filter(t =>
      t.videoId !== (this.currentTrack ? this.currentTrack.videoId : '') &&
      !this.queue.some(q => q.videoId === t.videoId)
    );

    if (recs.length === 0) {
      this.expandedRecList.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:32px;">Generating vibe recommendations...</div>';
      return;
    }

    recs.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'expanded-track-card';
      card.innerHTML = `
        <div class="expanded-track-card-left">
          <div class="expanded-card-thumb-wrap">
            <img class="expanded-card-thumb" src="${t.thumbnail || 'assets/default_cover.png'}">
          </div>
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

      const img = card.querySelector('img');
      this.fitCoverImage(img);

      card.onclick = () => {
        if (this.currentTrack) this.playedHistory.push(this.currentTrack);
        this.recommendedPool = (this.recommendedPool || []).filter(item => item.videoId !== t.videoId);
        this.playTrack(t, null, true);
      };

      this.expandedRecList.appendChild(card);
    });
  }

  // --- Playback Navigation Controls ---
  next() {
    if (this.queue.length === 0) {
      this.replenishRecommendations(this.currentTrack, true);
      return;
    }

    let nextTrack = null;
    if (this.isShuffle) {
      const randIdx = Math.floor(Math.random() * this.queue.length);
      nextTrack = this.queue.splice(randIdx, 1)[0];
    } else {
      nextTrack = this.queue.shift();
    }

    if (nextTrack) {
      if (this.currentTrack) {
        this.playedHistory.push(this.currentTrack);
      }
      this.playTrack(nextTrack, null, true);

      if (this.queue.length < 5) {
        this.replenishRecommendations(nextTrack);
      }
    }
  }

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    if (this.playedHistory.length > 0) {
      const prevTrack = this.playedHistory.pop();
      if (this.currentTrack) {
        this.queue.unshift(this.currentTrack);
      }
      this.playTrack(prevTrack, null, true);
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

  togglePlay() {
    if (!this.audio.src || !this.currentTrack) {
      if (this.queue.length > 0) {
        this.next();
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

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    if (this.shuffleDot) this.shuffleDot.classList.toggle('active', this.isShuffle);
    if (this.btnShuffle) this.btnShuffle.classList.toggle('active', this.isShuffle);
    if (this.expandedShuffleDot) this.expandedShuffleDot.classList.toggle('active', this.isShuffle);
    if (this.expandedBtnShuffle) this.expandedBtnShuffle.classList.toggle('active', this.isShuffle);
    if (window.showToast) window.showToast(this.isShuffle ? 'Shuffle Enabled' : 'Shuffle Disabled');
  }

  cycleRepeat() {
    this.repeatMode = (this.repeatMode + 1) % 3;
    const states = ['Repeat Off', 'Repeat All', 'Repeat One'];

    // Bottom Repeat
    if (this.repeatDot) this.repeatDot.classList.toggle('active', this.repeatMode > 0);
    if (this.btnRepeat) this.btnRepeat.classList.toggle('active', this.repeatMode > 0);
    if (this.repeatBadge) {
      this.repeatBadge.style.display = this.repeatMode === 2 ? 'block' : 'none';
      this.repeatBadge.textContent = '1';
    }

    // Expanded Repeat
    if (this.expandedRepeatDot) this.expandedRepeatDot.classList.toggle('active', this.repeatMode > 0);
    if (this.expandedBtnRepeat) this.expandedBtnRepeat.classList.toggle('active', this.repeatMode > 0);
    if (this.expandedRepeatBadge) {
      this.expandedRepeatBadge.style.display = this.repeatMode === 2 ? 'block' : 'none';
      this.expandedRepeatBadge.textContent = '1';
    }

    if (window.showToast) window.showToast(states[this.repeatMode]);
  }

  setVolume(pct) {
    this.volume = Math.max(0, Math.min(1, pct));
    this.isMuted = this.volume === 0;
    this.audio.volume = this.volume;
    localStorage.setItem('etsuko_volume', this.volume.toFixed(2));
    this.updateVolumeUI(this.volume);
  }

  toggleMute() {
    if (this.isMuted) {
      this.isMuted = false;
      this.setVolume(this.prevVolume || 0.75);
    } else {
      this.prevVolume = this.volume;
      this.setVolume(0);
      this.isMuted = true;
    }
  }

  updateVolumeUI(vol) {
    const pct = (vol * 100).toFixed(0);
    if (this.volumeProgress) this.volumeProgress.style.width = `${pct}%`;
    if (this.expandedVolumeFill) this.expandedVolumeFill.style.width = `${pct}%`;

    if (vol === 0 || this.isMuted) {
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

    // Synchronize Lyrics with Dissolving Passed Lines
    this.syncLyricsScroll();
  }

  updateBufferProgress() {
    if (!this.audio.duration || !this.audio.buffered.length) return;
    const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
    const duration = this.audio.duration;
    const pct = (bufferedEnd / duration) * 100;
    if (this.scrubberBuffered) this.scrubberBuffered.style.width = `${pct}%`;
    if (this.expandedScrubberBuffered) this.expandedScrubberBuffered.style.width = `${pct}%`;
  }

  handlePlaybackFailure() {
    this.consecutiveFailures++;
    const title = this.currentTrack ? this.currentTrack.title : 'Track';
    if (this.consecutiveFailures >= 3) {
      if (window.showToast) {
        window.showToast('Multiple playback issues detected. Network stream paused.');
      }
      this.onPlayStateChange(false);
      return;
    }

    if (window.showToast) {
      window.showToast(`Unable to stream "${title}". Skipping to next...`);
    }
    clearTimeout(this.failureSkipTimer);
    this.failureSkipTimer = setTimeout(() => {
      this.next();
    }, 1600);
  }

  handleAudioError(e) {
    if (this.userPaused) return;
    console.warn('[Etsuko] HTMLAudioElement error:', e);
    this.handlePlaybackFailure();
  }

  formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  updateActiveTrackHighlight() {
    if (!this.currentTrack) return;
    const currentVid = this.currentTrack.videoId;
    document.querySelectorAll('.track-row, .expanded-track-card, .track-card').forEach(el => {
      const vid = el.getAttribute('data-video-id');
      el.classList.toggle('active', vid === currentVid);
    });
  }

  renderVisualizer() {
    if (!this.canvasCtx || !this.analyser || !this.dataArray) return;
    const draw = () => {
      requestAnimationFrame(draw);
      if (!this.isPlaying) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      const width = this.canvasVisualizer.width;
      const height = this.canvasVisualizer.height;
      this.canvasCtx.clearRect(0, 0, width, height);

      const barWidth = 3;
      const gap = 2;
      const barCount = Math.floor(width / (barWidth + gap));
      let x = 0;

      for (let i = 0; i < barCount; i++) {
        const val = this.dataArray[i % this.dataArray.length] / 255;
        const barHeight = Math.max(2, val * height * 0.85);
        this.canvasCtx.fillStyle = `rgba(0, 240, 255, ${0.3 + val * 0.7})`;
        this.canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + gap;
      }
    };
    draw();
  }
}

// Global Player Singleton
window.addEventListener('DOMContentLoaded', () => {
  window.player = new EtsukoPlayer();
});
