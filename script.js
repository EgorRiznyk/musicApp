var CAR_SONGS = [
  {src:'songs/L\'One - Будь первый бей первым.mp3', title:'Будь первый бей первым', artist:'L\'One'},
  {src:'songs/Nautilus Pompilius - Я Хочу Быть С Тобой.mp3', title:'Я Хочу Быть С Тобой', artist:'Nautilus Pompilius'},
  {src:'songs/Ария - Потерянный рай.mp3', title:'Потерянный рай', artist:'Ария'},
  {src:'songs/Григорий Лепс feat. Ирина Аллегрова - Я Тебе Не Верю.mp3', title:'Я Тебе Не Верю', artist:'Григорий Лепс feat. Ирина Аллегрова'},
  {src:'songs/Григорий Лепс, Стас Пьеха - Она не твоя.mp3', title:'Она не твоя', artist:'Григорий Лепс, Стас Пьеха'},
  {src:'songs/Максим Фадеев - Орлы или вороны (ft. Григорий Лепс).mp3', title:'Орлы или вороны', artist:'Максим Фадеев ft. Григорий Лепс'},
  {src:'songs/Наутилус Помпилиус - Дыхание.mp3', title:'Дыхание', artist:'Наутилус Помпилиус'},
  {src:'songs/Русский Размер - Весь Этот Мир, Я Придумала Сама.mp3', title:'Весь Этот Мир', artist:'Русский Размер'},
  {src:'songs/Михаил Боярский - Всё пройдёт.mp3', title:'Всё пройдёт', artist:'Михаил Боярский'},
  {src:'songs/Виктор Цой - Группа крови.mp3', title:'Группа крови', artist:'Виктор Цой'},
  {src:'songs/Танцы Минус - Половинка.mp3', title:'Половинка', artist:'Танцы Минус'},
].map(function(s, i) { s.id = 'c' + i; s.isCar = true; return s; });

var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

var state = {
  currentTrack: null, playlist: CAR_SONGS, currentIndex: -1,
  isPlaying: false, isShuffle: false, isRepeat: false,
  previousVolume: 70, isMuted: false,
};

var DOM = {};
var AUDIO = new Audio();
AUDIO.preload = 'auto';

var gpsWatchId = null;

function id(s) { return document.getElementById(s); }

function cacheDOM() {
  'menuToggle sidebar libraryGrid driveOverlay driveBtn quickDrive driveExit driveThumb driveTrackTitle driveTrackChannel drivePlay drivePrev driveNext driveFav driveShuffle driveTime speedoNeedle speedoGlow speedoReadout speedoTicks playerBar playerThumb playerTitle playerChannel vinylDisc equalizer favBtn playBtn prevBtn nextBtn shuffleBtn repeatBtn progressBar progressFill currentTime totalTime volumeSlider volumeFill volumeBtn spinner'.split(' ').forEach(function(x) { DOM[x] = id(x); });
}

function fmt(sec) { return isNaN(sec) || sec < 0 ? '0:00' : Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0'); }

function trc(s, n) { return (s || '').length > (n || 30) ? (s || '').slice(0, n) + '...' : s; }

/* Favorites */
function getFav() { try { return JSON.parse(localStorage.getItem('fav')) || []; } catch(e) { return []; } }
function isFav(id) { return getFav().some(function(t) { return t.id === id; }); }
function togFav(track) {
  var f = getFav(), i = f.findIndex(function(t) { return t.id === track.id; });
  i > -1 ? f.splice(i, 1) : f.unshift({ id: track.id, title: track.title, artist: track.artist });
  localStorage.setItem('fav', JSON.stringify(f));
  if (DOM.favBtn) DOM.favBtn.classList.toggle('active', isFav(track.id));
  if (DOM.driveFav) DOM.driveFav.classList.toggle('active', isFav(track.id));
}

function renderGrid() {
  DOM.libraryGrid.innerHTML = '';
  CAR_SONGS.forEach(function(t, i) {
    var c = document.createElement('div');
    c.className = 'track-card';
    c.style.animationDelay = (i * 0.04) + 's';
    c.innerHTML = '<div class="track-card-thumb car-badge"><div class="track-card-icon car-icon"><i class="fas fa-car"></i></div><div class="track-card-overlay"><button class="track-card-play"><i class="fas fa-play"></i></button></div></div><div class="track-card-title" title="' + (t.title || '').replace(/"/g,'&quot;') + '">' + trc(t.title, 28) + '</div><div class="track-card-channel">' + t.artist + '</div>';
    c.addEventListener('click', function() { playAt(i); });
    DOM.libraryGrid.appendChild(c);
  });
  id('trackCount').textContent = CAR_SONGS.length + ' треков';
}

function playAt(idx) {
  if (idx < 0 || idx >= CAR_SONGS.length) return;
  state.currentIndex = idx;
  state.currentTrack = CAR_SONGS[idx];
  AUDIO.pause();
  AUDIO.src = state.currentTrack.src;
  DOM.playerThumb.style.background = ''; DOM.playerThumb.style.backgroundColor = 'var(--bg-elevated)';
  DOM.playerTitle.textContent = state.currentTrack.title;
  DOM.playerChannel.textContent = state.currentTrack.artist;
  DOM.playerBar.style.display = 'flex';
  DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
  DOM.progressFill.style.width = '0%'; DOM.currentTime.textContent = '0:00';
  AUDIO.play().then(function() {
    state.isPlaying = true; DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-pause"></i>';
  }).catch(function(){});
  document.querySelectorAll('.track-card').forEach(function(c, j) { c.style.background = j === idx ? 'var(--bg-hover)' : ''; });
  updateFavBtn();
}

function togglePlay() {
  if (!AUDIO.src) { if (CAR_SONGS.length) playAt(0); return; }
  if (AUDIO.paused) {
    AUDIO.play(); state.isPlaying = true;
    DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    AUDIO.pause(); state.isPlaying = false;
    DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
  }
}

function nextIdx() {
  if (state.isShuffle) { var n; do { n = Math.floor(Math.random() * CAR_SONGS.length); } while (n === state.currentIndex && CAR_SONGS.length > 1); return n; }
  return (state.currentIndex + 1) % CAR_SONGS.length;
}
function prevIdx() {
  if (AUDIO.currentTime > 3) { AUDIO.currentTime = 0; return -1; }
  if (state.isShuffle) return Math.floor(Math.random() * CAR_SONGS.length);
  return (state.currentIndex - 1 + CAR_SONGS.length) % CAR_SONGS.length;
}
function next() { if (state.isRepeat) { AUDIO.currentTime = 0; AUDIO.play(); return; } playAt(nextIdx()); }
function prev() { var i = prevIdx(); if (i > -1) playAt(i); }

function updateFavBtn() {
  if (!DOM.favBtn || !state.currentTrack) return;
  var f = isFav(state.currentTrack.id);
  DOM.favBtn.classList.toggle('active', f);
  DOM.favBtn.innerHTML = f ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
}

/* ─── GPS Speedometer ─── */
function startGPS() {
  if (gpsWatchId !== null) return;
  if (!navigator.geolocation) { showGPSStatus('Нет GPS'); return; }
  gpsWatchId = navigator.geolocation.watchPosition(
    function(pos) {
      var kmh = pos.coords.speed !== null && pos.coords.speed !== undefined ? Math.round(pos.coords.speed * 3.6) : 0;
      if (kmh < 0) kmh = 0;
      updateSpeedo(Math.min(kmh, 160));
    },
    function(err) {
      updateSpeedo(0);
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
  );
}

function stopGPS() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

/* ─── Driving Mode ─── */
function enterDrive() {
  DOM.driveOverlay.classList.add('active');
  if (!state.isPlaying) { playAt(state.currentIndex > -1 ? state.currentIndex : 0); }
  updateDriveUI();
  startGPS();
}

function exitDrive() {
  DOM.driveOverlay.classList.remove('active');
  stopGPS();
}

function updateDriveUI() {
  DOM.driveTime.textContent = fmt(AUDIO.currentTime || 0) + ' / ' + fmt(AUDIO.duration || 0);
  DOM.driveShuffle.style.color = state.isShuffle ? 'var(--accent)' : '';
  if (state.currentTrack) {
    DOM.driveThumb.innerHTML = '<i class="fas fa-car" style="font-size:1.3rem;color:var(--accent);opacity:0.6"></i>';
    DOM.driveTrackTitle.textContent = state.currentTrack.title;
    DOM.driveTrackChannel.textContent = state.currentTrack.artist;
    DOM.drivePlay.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    DOM.driveFav.classList.toggle('active', isFav(state.currentTrack.id));
  } else {
    DOM.driveThumb.innerHTML = '';
    DOM.driveTrackTitle.textContent = 'Нажми ▶'; DOM.driveTrackChannel.textContent = '';
    DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
  }
}

/* ─── Speedometer display ─── */
function buildTicks() {
  if (!DOM.speedoTicks) return;
  DOM.speedoTicks.innerHTML = '';
  var size = DOM.speedoTicks.parentElement.offsetWidth || 300;
  var R = size * 0.46, start = -60, total = 270;
  for (var i = 0; i <= 160; i += 10) {
    var a = start + (i / 160) * total;
    var isMaj = i % 20 === 0;
    var t = document.createElement('div');
    t.className = 'speedo-tick' + (isMaj ? ' major' : '');
    t.style.transform = 'rotate(' + a + 'deg)'; t.style.transformOrigin = '50% ' + R + 'px';
    DOM.speedoTicks.appendChild(t);
    if (isMaj) {
      var l = document.createElement('div');
      l.className = 'speedo-tick-label';
      l.style.transform = 'rotate(' + a + 'deg)'; l.style.transformOrigin = '50% ' + R + 'px';
      var s = document.createElement('span'); s.textContent = i; l.appendChild(s);
      DOM.speedoTicks.appendChild(l);
    }
  }
}

function updateSpeedo(kmh) {
  if (!DOM.speedoNeedle) return;
  if (kmh > 160) kmh = 160;
  var deg = -60 + (kmh / 160) * 270;
  DOM.speedoNeedle.style.transform = 'translateX(-50%) rotate(' + deg + 'deg)';
  if (DOM.speedoGlow) DOM.speedoGlow.style.transform = 'translateX(-50%) rotate(' + deg + 'deg)';
  if (DOM.speedoReadout) DOM.speedoReadout.textContent = kmh;
}

/* Audio events */
var errCnt = 0, stuck = null;
AUDIO.addEventListener('play', function() {
  state.isPlaying = true; errCnt = 0;
  DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  if (DOM.driveOverlay.classList.contains('active')) {
    DOM.drivePlay.innerHTML = '<i class="fas fa-pause"></i>';
    if ('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(function(){});
  }
  if (DOM.vinylDisc) DOM.vinylDisc.classList.add('visible', 'spinning');
  if (DOM.equalizer) DOM.equalizer.classList.add('active');
});
AUDIO.addEventListener('pause', function() {
  state.isPlaying = false;
  DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
  if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
  if (DOM.vinylDisc) DOM.vinylDisc.classList.remove('spinning');
  if (DOM.equalizer) DOM.equalizer.classList.remove('active');
});
AUDIO.addEventListener('ended', function() { next(); });
AUDIO.addEventListener('timeupdate', function() {
  if (AUDIO.duration) {
    DOM.progressFill.style.width = (AUDIO.currentTime / AUDIO.duration * 100) + '%';
    DOM.currentTime.textContent = fmt(AUDIO.currentTime);
    DOM.totalTime.textContent = fmt(AUDIO.duration);
  }
  if (DOM.driveOverlay.classList.contains('active') && AUDIO.duration) {
    DOM.driveTime.textContent = fmt(AUDIO.currentTime) + ' / ' + fmt(AUDIO.duration);
  }
});
AUDIO.addEventListener('loadedmetadata', function() { DOM.totalTime.textContent = fmt(AUDIO.duration) || '0:00'; });
AUDIO.addEventListener('error', function() { errCnt++; if (errCnt > 3) { errCnt = 0; return; } if (CAR_SONGS.length > 1) { AUDIO.pause(); next(); } });
AUDIO.addEventListener('playing', function() { errCnt = 0; if (stuck) { clearTimeout(stuck); stuck = null; } });
AUDIO.addEventListener('loadstart', function() {
  if (stuck) clearTimeout(stuck);
  stuck = setTimeout(function() { if (AUDIO.paused && state.isPlaying && CAR_SONGS.length > 1) next(); }, 10000);
});

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', function() {
  cacheDOM();
  renderGrid();
  buildTicks();
  state.currentIndex = 0;

  DOM.menuToggle.addEventListener('click', function() { DOM.sidebar.classList.toggle('open'); });
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && !DOM.sidebar.contains(e.target) && e.target !== DOM.menuToggle && !DOM.menuToggle.contains(e.target)) DOM.sidebar.classList.remove('open');
  });

  /* Drive */
  DOM.driveBtn.addEventListener('click', enterDrive);
  DOM.quickDrive.addEventListener('click', function(e) { e.preventDefault(); enterDrive(); });
  DOM.driveExit.addEventListener('click', exitDrive);
  DOM.drivePlay.addEventListener('click', togglePlay);
  DOM.drivePrev.addEventListener('click', prev);
  DOM.driveNext.addEventListener('click', next);
  DOM.driveFav.addEventListener('click', function() { if (state.currentTrack) { togFav(state.currentTrack); DOM.driveFav.classList.toggle('active', isFav(state.currentTrack.id)); } });
  DOM.driveShuffle.addEventListener('click', function() {
    state.isShuffle = !state.isShuffle;
    DOM.driveShuffle.style.color = state.isShuffle ? 'var(--accent)' : '';
    DOM.shuffleBtn.style.color = state.isShuffle ? 'var(--accent)' : '';
  });

  /* Player */
  DOM.playBtn.addEventListener('click', togglePlay);
  DOM.prevBtn.addEventListener('click', prev);
  DOM.nextBtn.addEventListener('click', next);
  DOM.shuffleBtn.addEventListener('click', function() {
    state.isShuffle = !state.isShuffle;
    DOM.shuffleBtn.style.color = state.isShuffle ? 'var(--accent)' : '';
  });
  DOM.repeatBtn.addEventListener('click', function() {
    state.isRepeat = !state.isRepeat;
    DOM.repeatBtn.style.color = state.isRepeat ? 'var(--accent)' : '';
  });
  DOM.favBtn.addEventListener('click', function(e) { e.stopPropagation(); if (state.currentTrack) togFav(state.currentTrack); });

  /* Progress */
  var tip = id('progressTooltip');
  DOM.progressBar.addEventListener('mousemove', function(e) {
    var d = AUDIO.duration || 0; if (!d) return;
    var r = DOM.progressBar.getBoundingClientRect();
    var p = (e.clientX - r.left) / r.width;
    tip.textContent = fmt(p * d); tip.style.left = Math.max(0, Math.min(100, p * 100)) + '%';
  });
  DOM.progressBar.addEventListener('click', function(e) {
    var d = AUDIO.duration || 0; if (!d) return;
    var r = DOM.progressBar.getBoundingClientRect();
    AUDIO.currentTime = ((e.clientX - r.left) / r.width) * d;
  });

  /* Volume */
  DOM.volumeSlider.addEventListener('click', function(e) {
    var r = DOM.volumeSlider.getBoundingClientRect();
    var v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    AUDIO.volume = v; DOM.volumeFill.style.width = (v * 100) + '%';
    state.isMuted = false; state.previousVolume = v * 100;
    DOM.volumeBtn.innerHTML = v === 0 ? '<i class="fas fa-volume-mute"></i>' : v < 0.5 ? '<i class="fas fa-volume-down"></i>' : '<i class="fas fa-volume-up"></i>';
  });
  DOM.volumeBtn.addEventListener('click', function() {
    state.isMuted = !state.isMuted;
    if (state.isMuted) { state.previousVolume = AUDIO.volume * 100; AUDIO.volume = 0; DOM.volumeFill.style.width = '0%'; }
    else { AUDIO.volume = state.previousVolume / 100; DOM.volumeFill.style.width = state.previousVolume + '%'; }
    DOM.volumeBtn.innerHTML = state.isMuted ? '<i class="fas fa-volume-mute"></i>' : (AUDIO.volume < 0.5 ? '<i class="fas fa-volume-down"></i>' : '<i class="fas fa-volume-up"></i>');
  });

  /* Keyboard */
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': AUDIO.currentTime = Math.min((AUDIO.duration || 0), AUDIO.currentTime + 5); break;
      case 'ArrowLeft': AUDIO.currentTime = Math.max(0, AUDIO.currentTime - 5); break;
      case 'ArrowUp': e.preventDefault(); var vu = Math.min(1, AUDIO.volume + 0.05); AUDIO.volume = vu; DOM.volumeFill.style.width = (vu*100)+'%'; state.isMuted = false; DOM.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>'; break;
      case 'ArrowDown': e.preventDefault(); var vd = Math.max(0, AUDIO.volume - 0.05); AUDIO.volume = vd; DOM.volumeFill.style.width = (vd*100)+'%'; state.isMuted = false; DOM.volumeBtn.innerHTML = vd === 0 ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-down"></i>'; break;
      case 'KeyN': next(); break;
      case 'KeyS': prev(); break;
      case 'KeyM': DOM.volumeBtn.click(); break;
    }
  });

  /* Auto drive on mobile */
  if (isMobile) setTimeout(enterDrive, 300);
});
