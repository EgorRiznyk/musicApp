/* ─── Car Songs (pre-loaded) ─── */
var CAR_SONGS = [
  {file:'songs/L\'One - Будь первый бей первым.mp3', title:'Будь первый бей первым', artist:'L\'One'},
  {file:'songs/Nautilus Pompilius - Я Хочу Быть С Тобой.mp3', title:'Я Хочу Быть С Тобой', artist:'Nautilus Pompilius'},
  {file:'songs/Ария - Потерянный рай.mp3', title:'Потерянный рай', artist:'Ария'},
  {file:'songs/Григорий Лепс feat. Ирина Аллегрова - Я Тебе Не Верю.mp3', title:'Я Тебе Не Верю', artist:'Григорий Лепс feat. Ирина Аллегрова'},
  {file:'songs/Григорий Лепс, Стас Пьеха - Она не твоя.mp3', title:'Она не твоя', artist:'Григорий Лепс, Стас Пьеха'},
  {file:'songs/Максим Фадеев - Орлы или вороны (ft. Григорий Лепс).mp3', title:'Орлы или вороны', artist:'Максим Фадеев ft. Григорий Лепс'},
  {file:'songs/Наутилус Помпилиус - Дыхание.mp3', title:'Дыхание', artist:'Наутилус Помпилиус'},
  {file:'songs/Русский Размер - Весь Этот Мир, Я Придумала Сама.mp3', title:'Весь Этот Мир', artist:'Русский Размер'},
];

var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

var state = {
  currentTrack: null,
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  previousVolume: 70,
  isMuted: false,
  library: [],
  carSongs: [],
};

var DOM = {};
var AUDIO = new Audio();
AUDIO.preload = 'auto';

function cacheDOM() {
  var ids = [
    'sidebar', 'menuToggle',
    'libraryGrid', 'uploadZone', 'fileInput', 'uploadBtn', 'emptyLibrary', 'emptyUploadBtn',
    'libraryCount', 'librarySearch',
    'favResults', 'favResultsGrid', 'favBack', 'sidebarFavorites',
    'playerBar', 'playerThumb', 'playerTitle', 'playerChannel',
    'vinylDisc', 'equalizer',
    'favBtn',
    'playBtn', 'prevBtn', 'nextBtn', 'shuffleBtn', 'repeatBtn',
    'progressBar', 'progressFill', 'currentTime', 'totalTime',
    'volumeSlider', 'volumeFill', 'volumeBtn',
    'playlistDrawer', 'drawerOverlay', 'drawerList', 'drawerClose', 'playlistBtn',
    'driveOverlay', 'driveBtn', 'driveExit', 'driveThumb', 'driveTrackTitle', 'driveTrackChannel',
    'drivePlay', 'drivePrev', 'driveNext', 'driveFav', 'driveShuffle', 'driveTime',
    'speedoNeedle', 'speedoGlow', 'speedoReadout', 'speedoTicks', 'spinner',
    'libraryView',
  ];
  ids.forEach(function(id) { DOM[id] = document.getElementById(id); });
}

function showSpinner() { DOM.spinner.classList.add('active'); }
function hideSpinner() { DOM.spinner.classList.remove('active'); }

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ':' + s.toString().padStart(2, '0');
}

function truncate(str, len) { len = len || 50; return str.length > len ? str.slice(0, len) + '...' : str; }

/* Favorites */
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('favorites')) || []; } catch(e) { return []; }
}
function isFavorite(id) { return getFavorites().some(function(t) { return t.id === id; }); }

function toggleFavorite(track) {
  var favs = getFavorites();
  var idx = favs.findIndex(function(t) { return t.id === track.id; });
  if (idx > -1) { favs.splice(idx, 1); }
  else { favs.unshift({ id: track.id, title: track.title, artist: track.artist }); }
  localStorage.setItem('favorites', JSON.stringify(favs));
  updateFavBtn(track.id);
  if (DOM.driveFav) DOM.driveFav.classList.toggle('active', isFavorite(track.id));
}

function updateFavBtn(trackId) {
  if (!DOM.favBtn) return;
  var isFav = isFavorite(trackId || (state.currentTrack && state.currentTrack.id));
  if (trackId || state.currentTrack) {
    DOM.favBtn.classList.toggle('active', isFav);
    DOM.favBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
  }
}

function renderFavorites() {
  var items = getFavorites();
  DOM.favResultsGrid.innerHTML = '';
  if (items.length === 0) {
    DOM.favResultsGrid.innerHTML = '<div class="no-results"><i class="fas fa-heart"></i><p>Пока нет избранных треков</p></div>';
    showView('favorites');
    return;
  }
  showView('favorites');
  items.forEach(function(item, index) {
    var resolved = resolveTrack(item);
    var card = createTrackCard(resolved || item, index, items);
    DOM.favResultsGrid.appendChild(card);
  });
}

/* Resolve a partial track (from favorites/recent) to full library track */
function resolveTrack(partial) {
  return state.library.find(function(t) { return t.id === partial.id; }) || partial;
}

function createTrackCard(track, index, items) {
  var card = document.createElement('div');
  card.className = 'track-card';
  card.style.animationDelay = (index * 0.04) + 's';
  var isCar = track.isCar;
  card.innerHTML = '<div class="track-card-thumb' + (isCar ? ' car-badge' : '') + '"><div class="track-card-icon' + (isCar ? ' car-icon' : '') + '">' + (isCar ? '<i class="fas fa-car"></i>' : '<i class="fas fa-music"></i>') + '</div><div class="track-card-overlay"><button class="track-card-play"><i class="fas fa-play"></i></button></div><span class="track-card-duration">' + (track.duration ? formatTime(track.duration) : '--:--') + '</span></div><div class="track-card-title" title="' + (track.title || '').replace(/"/g, '&quot;') + '">' + truncate(track.title || 'Без названия', 30) + '</div><div class="track-card-channel">' + (track.artist || 'Неизвестно') + '</div></div>';
  card.addEventListener('click', function() { playTrack(index, items); });
  return card;
}

/* IndexedDB */
var DB = {
  _db: null,
  init: function() {
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open('MusicAppDB', 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('tracks')) {
          db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function(e) { DB._db = e.target.result; resolve(); };
      req.onerror = function(e) { reject(e); };
    });
  },
  addTrack: function(track) {
    return new Promise(function(resolve, reject) {
      var tx = DB._db.transaction('tracks', 'readwrite');
      var store = tx.objectStore('tracks');
      var req = store.add(track);
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e); };
    });
  },
  getAllTracks: function() {
    return new Promise(function(resolve, reject) {
      var tx = DB._db.transaction('tracks', 'readonly');
      var store = tx.objectStore('tracks');
      var req = store.getAll();
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e); };
    });
  },
  deleteTrack: function(id) {
    return new Promise(function(resolve, reject) {
      var tx = DB._db.transaction('tracks', 'readwrite');
      var store = tx.objectStore('tracks');
      var req = store.delete(id);
      req.onsuccess = function() { resolve(); };
      req.onerror = function(e) { reject(e); };
    });
  },
};

/* Parse filename */
function parseFilename(name) {
  var s = name.replace(/\.[^/.]+$/, '').trim();
  var parts = s.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts.slice(0, -1).join(' - ').trim(), title: parts[parts.length - 1].trim() };
  }
  return { artist: 'Неизвестно', title: s || 'Без названия' };
}

/* Get audio duration */
function getFileDuration(file) {
  return new Promise(function(resolve) {
    var url = URL.createObjectURL(file);
    var audio = new Audio();
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = function() { URL.revokeObjectURL(url); resolve(audio.duration); };
    audio.onerror = function() { URL.revokeObjectURL(url); resolve(0); };
  });
}

/* Handle uploaded files */
async function handleFiles(files) {
  showSpinner();
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!file.type.startsWith('audio/')) continue;
    var meta = parseFilename(file.name);
    var duration = await getFileDuration(file);
    await DB.addTrack({ title: meta.title, artist: meta.artist, duration: duration, file: file, added: Date.now() });
  }
  hideSpinner();
  await loadLibrary();
}

function showView(view) {
  DOM.libraryView.style.display = view === 'library' ? '' : 'none';
  DOM.favResults.style.display = view === 'favorites' ? '' : 'none';
}

/* Initialise car songs */
function initCarSongs() {
  state.carSongs = CAR_SONGS.map(function(s, i) {
    return {
      id: 'car_' + i,
      title: s.title,
      artist: s.artist,
      src: s.file,
      isCar: true,
      duration: 0,
    };
  });
  return state.carSongs;
}

/* Load library: car songs + IndexedDB tracks */
async function loadLibrary() {
  showSpinner();
  var car = initCarSongs();
  var uploaded = [];
  try { uploaded = await DB.getAllTracks(); } catch(e) {}
  state.library = car.concat(uploaded);
  renderLibrary(state.library);
  hideSpinner();
}

function renderLibrary(tracks) {
  DOM.libraryGrid.innerHTML = '';

  if (tracks.length === 0) {
    DOM.emptyLibrary.style.display = '';
    DOM.libraryGrid.style.display = 'none';
    if (DOM.libraryCount) DOM.libraryCount.textContent = '0 треков';
    return;
  }

  DOM.emptyLibrary.style.display = 'none';
  DOM.libraryGrid.style.display = '';
  DOM.libraryCount.textContent = tracks.length + ' треков';

  tracks.forEach(function(track, index) {
    var card = createTrackCard(track, index, tracks);

    if (!track.isCar && track.id) {
      var delBtn = document.createElement('button');
      delBtn.className = 'track-del';
      delBtn.innerHTML = '<i class="fas fa-trash"></i>';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteTrack(track.id);
      });
      card.querySelector('.track-card-thumb').appendChild(delBtn);
    }

    DOM.libraryGrid.appendChild(card);
  });
}

async function deleteTrack(id) {
  if (!confirm('Удалить этот трек?')) return;
  await DB.deleteTrack(id);
  if (state.currentTrack && state.currentTrack.id === id) {
    AUDIO.pause(); AUDIO.src = ''; state.currentTrack = null; DOM.playerBar.style.display = 'none';
  }
  await loadLibrary();
}

/* Play track */
function playTrack(index, items) {
  var track = items[index];
  if (!track) return;

  if (!track.src && !track.file && track.id) {
    var found = state.library.find(function(t) { return t.id === track.id; });
    if (found) track = found;
  }

  state.currentIndex = index;
  state.playlist = items;
  AUDIO.pause();

  state.currentTrack = track;
  DOM.playerThumb.style.backgroundImage = 'url()';
  DOM.playerThumb.style.backgroundColor = 'var(--bg-elevated)';
  DOM.playerTitle.textContent = track.title || 'Без названия';
  DOM.playerChannel.textContent = track.artist || 'Неизвестно';
  DOM.playerBar.style.display = 'flex';
  DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
  DOM.progressFill.style.width = '0%';
  DOM.currentTime.textContent = '0:00';

  playAudio(track);
  highlightCards(index, '.track-card');
  updateDrawer();
}

function playAudio(track) {
  if (track._blobUrl) { URL.revokeObjectURL(track._blobUrl); track._blobUrl = null; }

  if (track.src) {
    AUDIO.src = track.src;
  } else if (track.file) {
    track._blobUrl = URL.createObjectURL(track.file);
    AUDIO.src = track._blobUrl;
  } else {
    return;
  }

  AUDIO.play().then(function() {
    state.isPlaying = true;
    DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    if (DOM.driveOverlay.classList.contains('active')) {
      DOM.drivePlay.innerHTML = '<i class="fas fa-pause"></i>';
    }
  }).catch(function() {});

  saveRecentTrack(track);
  updateFavBtn(track.id);
  if (DOM.driveOverlay.classList.contains('active')) updateDriveUI();
}

function togglePlay() {
  if (!AUDIO.src) {
    if (state.library.length > 0) { playTrack(0, state.library); return; }
    return;
  }
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

function getNextIndex() {
  if (state.isShuffle) { var idx; do { idx = Math.floor(Math.random() * state.playlist.length); } while (idx === state.currentIndex && state.playlist.length > 1); return idx; }
  return (state.currentIndex + 1) % state.playlist.length;
}

function getPrevIndex() {
  if (AUDIO.currentTime > 3) { AUDIO.currentTime = 0; return -1; }
  if (state.isShuffle) return Math.floor(Math.random() * state.playlist.length);
  return (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
}

function nextTrack() {
  if (state.playlist.length === 0) return;
  if (state.isRepeat) { AUDIO.currentTime = 0; AUDIO.play(); return; }
  playTrack(getNextIndex(), state.playlist);
}

function prevTrack() {
  if (state.playlist.length === 0) return;
  var idx = getPrevIndex();
  if (idx === -1) return;
  playTrack(idx, state.playlist);
}

function updateDrawer() {
  if (state.playlist.length === 0) {
    DOM.drawerList.innerHTML = '<p class="drawer-empty">Плейлист пуст</p>'; return;
  }
  var html = '';
  for (var i = 0; i < state.playlist.length; i++) {
    var t = state.playlist[i];
    var active = i === state.currentIndex;
    html += '<div class="drawer-item' + (active ? ' active' : '') + '" data-index="' + i + '"><div class="drawer-item-thumb"><i class="fas ' + (t.isCar ? 'fa-car' : 'fa-music') + '"></i></div><div class="drawer-item-info"><div class="drawer-item-title">' + truncate(t.title || 'Без названия', 30) + '</div><div class="drawer-item-channel">' + (t.artist || 'Неизвестно') + '</div></div>' + (active ? '<div class="drawer-item-current">Сейчас</div>' : '') + '</div>';
  }
  DOM.drawerList.innerHTML = html;
  DOM.drawerList.querySelectorAll('.drawer-item').forEach(function(item) {
    item.addEventListener('click', function() { playTrack(parseInt(item.dataset.index), state.playlist); });
  });
}

function toggleDrawer() {
  DOM.playlistDrawer.classList.toggle('open');
  DOM.drawerOverlay.classList.toggle('show');
}

/* Recent */
function getRecentTracks() {
  try { return JSON.parse(localStorage.getItem('recentTracks')) || []; } catch(e) { return []; }
}
function saveRecentTrack(track) {
  var tracks = getRecentTracks();
  tracks = tracks.filter(function(t) { return t.id !== track.id; });
  tracks.unshift({ id: track.id, title: track.title, artist: track.artist });
  if (tracks.length > 20) tracks.length = 20;
  localStorage.setItem('recentTracks', JSON.stringify(tracks));
  renderRecentTracks();
}

function renderRecentTracks() {
  var tracks = getRecentTracks();
  var container = document.getElementById('recentContainer');
  if (!container) return;
  container.innerHTML = '';
  if (tracks.length === 0) return;
  var label = document.createElement('p');
  label.className = 'sidebar-label';
  label.textContent = 'Недавние';
  container.appendChild(label);
  tracks.slice(0, 5).forEach(function(t) {
    var a = document.createElement('a');
    a.href = '#';
    a.className = 'playlist-item recent-item';
    a.dataset.id = t.id;
    a.innerHTML = '<i class="fas fa-clock"></i> ' + truncate(t.title || '', 20);
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var found = resolveTrack(t);
      var idx = state.library.indexOf(found);
      if (idx > -1) playTrack(idx, state.library);
    });
    container.appendChild(a);
  });
}

function highlightCards(index, selector) {
  document.querySelectorAll(selector).forEach(function(card, i) {
    card.style.background = i === index ? 'var(--bg-hover)' : '';
  });
}

/* Build speedometer ticks */
function buildSpeedoTicks() {
  if (!DOM.speedoTicks) return;
  DOM.speedoTicks.innerHTML = '';
  var total = 270;
  var start = -60;
  var radius = 138;

  var size = DOM.speedoTicks.parentElement.offsetWidth || 300;
  radius = size * 0.46;

  for (var i = 0; i <= 100; i += 5) {
    var angle = start + (i / 100) * total;
    var rad = angle * Math.PI / 180;

    if (i % 10 === 0) {
      var t = document.createElement('div');
      t.className = 'speedo-tick major';
      t.style.transform = 'rotate(' + angle + 'deg)';
      t.style.transformOrigin = '50% ' + radius + 'px';
      DOM.speedoTicks.appendChild(t);

      var lb = document.createElement('div');
      lb.className = 'speedo-tick-label';
      lb.style.transform = 'rotate(' + angle + 'deg)';
      lb.style.transformOrigin = '50% ' + radius + 'px';
      var sp = document.createElement('span');
      sp.textContent = i;
      lb.appendChild(sp);
      DOM.speedoTicks.appendChild(lb);
    } else {
      var t = document.createElement('div');
      t.className = 'speedo-tick';
      t.style.transform = 'rotate(' + angle + 'deg)';
      t.style.transformOrigin = '50% ' + radius + 'px';
      DOM.speedoTicks.appendChild(t);
    }
  }
}

/* Library search */
function filterLibrary(query) {
  var q = query.toLowerCase().trim();
  var filtered = q ? state.library.filter(function(t) {
    return (t.title && t.title.toLowerCase().includes(q)) || (t.artist && t.artist.toLowerCase().includes(q));
  }) : state.library;
  renderLibrary(filtered);
}

/* ─── DOMContentLoaded ─── */
document.addEventListener('DOMContentLoaded', async function() {
  cacheDOM();

  try { await DB.init(); } catch(e) { console.error('DB init:', e); }
  await loadLibrary();
  renderRecentTracks();

  /* Set car songs as default playlist */
  state.playlist = state.carSongs;
  state.currentIndex = -1;

  /* Generate speedometer ticks */
  buildSpeedoTicks();

  /* Upload */
  DOM.uploadBtn.addEventListener('click', function() { DOM.fileInput.click(); });
  var eub = document.getElementById('emptyUploadBtn');
  if (eub) eub.addEventListener('click', function() { DOM.fileInput.click(); });

  DOM.uploadZone.addEventListener('dragover', function(e) { e.preventDefault(); DOM.uploadZone.classList.add('drag-over'); });
  DOM.uploadZone.addEventListener('dragleave', function() { DOM.uploadZone.classList.remove('drag-over'); });
  DOM.uploadZone.addEventListener('drop', function(e) { e.preventDefault(); DOM.uploadZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
  DOM.fileInput.addEventListener('change', function() {
    if (DOM.fileInput.files.length > 0) { handleFiles(DOM.fileInput.files); DOM.fileInput.value = ''; }
  });

  DOM.librarySearch.addEventListener('input', function() { filterLibrary(DOM.librarySearch.value); });

  /* Nav */
  document.getElementById('navHome').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    this.classList.add('active');
    showView('library');
    DOM.librarySearch.value = '';
    filterLibrary('');
  });

  DOM.sidebarFavorites.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    renderFavorites();
  });

  DOM.favBack.addEventListener('click', function() { showView('library'); });

  /* Driving Mode */
  function enterDriveMode() {
    DOM.driveOverlay.classList.add('active');
    if (state.playlist.length === 0 || !state.playlist.some(function(t) { return t.isCar; })) {
      state.playlist = state.carSongs;
      state.currentIndex = -1;
    }
    if (!state.isPlaying && state.carSongs.length > 0) {
      playTrack(0, state.carSongs);
    }
    updateDriveUI();
    if (!state.isPlaying) {
      DOM.driveTrackTitle.textContent = 'Нажми ▶ чтобы слушать';
      DOM.driveTrackChannel.textContent = '';
      if (DOM.speedoReadout) DOM.speedoReadout.textContent = '0';
    }
  }

  function updateDriveUI() {
    DOM.driveTime.textContent = formatTime(AUDIO.currentTime || 0) + ' / ' + formatTime(AUDIO.duration || 0);
    DOM.driveShuffle.style.color = state.isShuffle ? 'var(--accent)' : '';

    if (state.currentTrack) {
      DOM.driveThumb.innerHTML = '<i class="fas ' + (state.currentTrack.isCar ? 'fa-car' : 'fa-music') + '" style="font-size:1.3rem;color:var(--text-subdued);opacity:0.5"></i>';
      DOM.driveTrackTitle.textContent = state.currentTrack.title || 'Без названия';
      DOM.driveTrackChannel.textContent = state.currentTrack.artist || '';
      DOM.drivePlay.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      DOM.driveFav.classList.toggle('active', isFavorite(state.currentTrack.id));
    } else {
      DOM.driveThumb.innerHTML = '';
      DOM.driveTrackTitle.textContent = 'Нет трека';
      DOM.driveTrackChannel.textContent = '';
      DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
      if (DOM.speedoReadout) DOM.speedoReadout.textContent = '0';
    }
  }

  DOM.driveBtn.addEventListener('click', enterDriveMode);
  DOM.driveExit.addEventListener('click', function() { DOM.driveOverlay.classList.remove('active'); });
  DOM.drivePlay.addEventListener('click', togglePlay);
  DOM.drivePrev.addEventListener('click', prevTrack);
  DOM.driveNext.addEventListener('click', nextTrack);
  DOM.driveFav.addEventListener('click', function() {
    if (state.currentTrack) { toggleFavorite(state.currentTrack); DOM.driveFav.classList.toggle('active', isFavorite(state.currentTrack.id)); }
  });
  DOM.driveShuffle.addEventListener('click', function() {
    state.isShuffle = !state.isShuffle;
    DOM.driveShuffle.style.color = state.isShuffle ? 'var(--accent)' : '';
    DOM.shuffleBtn.style.color = state.isShuffle ? 'var(--accent)' : '';
  });

  /* Wake Lock — не даём экрану гаснуть во время воспроизведения */
  var wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', function() {});
      }
    } catch(e) {}
  }

  AUDIO.addEventListener('play', function() {
    if (DOM.driveOverlay.classList.contains('active') || isMobile) requestWakeLock();
  });
  AUDIO.addEventListener('pause', function() {
    if (wakeLock) { try { wakeLock.release(); wakeLock = null; } catch(e) {} }
  });

  /* Auto-enter driving mode on mobile */
  if (isMobile) {
    setTimeout(enterDriveMode, 500);
  }

  /* Sidebar toggle */
  DOM.menuToggle.addEventListener('click', function() { DOM.sidebar.classList.toggle('open'); });
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!DOM.sidebar.contains(e.target) && e.target !== DOM.menuToggle && !DOM.menuToggle.contains(e.target)) {
        DOM.sidebar.classList.remove('open');
      }
    }
  });

  /* Player controls */
  DOM.playBtn.addEventListener('click', togglePlay);
  DOM.prevBtn.addEventListener('click', prevTrack);
  DOM.nextBtn.addEventListener('click', nextTrack);
  DOM.shuffleBtn.addEventListener('click', function() {
    state.isShuffle = !state.isShuffle;
    DOM.shuffleBtn.style.color = state.isShuffle ? 'var(--accent)' : '';
  });
  DOM.repeatBtn.addEventListener('click', function() {
    state.isRepeat = !state.isRepeat;
    DOM.repeatBtn.style.color = state.isRepeat ? 'var(--accent)' : '';
  });

  /* Fav btn */
  DOM.favBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (state.currentTrack) toggleFavorite(state.currentTrack);
  });

  /* Progress */
  var tooltip = document.getElementById('progressTooltip');
  DOM.progressBar.addEventListener('mousemove', function(e) {
    var d = AUDIO.duration || 0; if (!d) return;
    var rect = DOM.progressBar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    tooltip.textContent = formatTime(ratio * d);
    tooltip.style.left = Math.max(0, Math.min(100, ratio * 100)) + '%';
  });
  DOM.progressBar.addEventListener('click', function(e) {
    var d = AUDIO.duration || 0; if (!d) return;
    var rect = DOM.progressBar.getBoundingClientRect();
    AUDIO.currentTime = ((e.clientX - rect.left) / rect.width) * d;
  });

  /* Volume */
  DOM.volumeSlider.addEventListener('click', function(e) {
    var rect = DOM.volumeSlider.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    AUDIO.volume = ratio;
    DOM.volumeFill.style.width = (ratio * 100) + '%';
    state.isMuted = false;
    state.previousVolume = ratio * 100;
    updateVolumeIcon(ratio);
  });

  function updateVolumeIcon(ratio) {
    if (ratio === 0 || state.isMuted) DOM.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    else if (ratio < 0.5) DOM.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
    else DOM.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  }

  DOM.volumeBtn.addEventListener('click', function() {
    state.isMuted = !state.isMuted;
    if (state.isMuted) { state.previousVolume = AUDIO.volume * 100; AUDIO.volume = 0; DOM.volumeFill.style.width = '0%'; }
    else { AUDIO.volume = state.previousVolume / 100; DOM.volumeFill.style.width = state.previousVolume + '%'; }
    updateVolumeIcon(state.isMuted ? 0 : AUDIO.volume);
  });

  DOM.playlistBtn.addEventListener('click', toggleDrawer);
  DOM.drawerClose.addEventListener('click', toggleDrawer);
  DOM.drawerOverlay.addEventListener('click', toggleDrawer);

  /* Audio events */
  AUDIO.addEventListener('play', function() {
    state.isPlaying = true;
    DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-pause"></i>';
    viz(); drv();
  });
  AUDIO.addEventListener('pause', function() {
    state.isPlaying = false;
    DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
    viz(); drv();
  });
  AUDIO.addEventListener('ended', function() {
    state.isPlaying = false;
    DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (DOM.driveOverlay.classList.contains('active')) DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
    viz(); nextTrack();
  });
  AUDIO.addEventListener('timeupdate', function() {
    if (AUDIO.duration) {
      DOM.progressFill.style.width = (AUDIO.currentTime / AUDIO.duration * 100) + '%';
      DOM.currentTime.textContent = formatTime(AUDIO.currentTime);
      DOM.totalTime.textContent = formatTime(AUDIO.duration);
    }
    if (DOM.driveOverlay.classList.contains('active')) {
      DOM.driveTime.textContent = formatTime(AUDIO.currentTime) + ' / ' + formatTime(AUDIO.duration);
      if (AUDIO.duration) { var pct = (AUDIO.currentTime / AUDIO.duration) * 100; updateSpeedo(pct); }
    }
  });
  AUDIO.addEventListener('loadedmetadata', function() {
    DOM.totalTime.textContent = formatTime(AUDIO.duration) || '0:00';
  });
  var errorCount = 0;
  var stuckTimer = null;

  AUDIO.addEventListener('error', function() {
    errorCount++;
    if (errorCount > 3) { errorCount = 0; return; }
    if (state.playlist.length > 1) { nextTrack(); return; }
    if (state.currentTrack) {
      errorCount = 0;
      AUDIO.src = state.currentTrack.src || state.currentTrack._blobUrl;
      AUDIO.play().catch(function(){});
    }
  });

  AUDIO.addEventListener('playing', function() {
    errorCount = 0;
    if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
  });

  /* Если трек не начал играть за 10 сек — пропускаем */
  AUDIO.addEventListener('loadstart', function() {
    if (stuckTimer) clearTimeout(stuckTimer);
    stuckTimer = setTimeout(function() {
      if (AUDIO.paused && state.isPlaying && state.playlist.length > 1) {
        nextTrack();
      }
    }, 10000);
  });

  function viz() {
    var p = !AUDIO.paused && AUDIO.src;
    if (p) {
      if (DOM.vinylDisc) DOM.vinylDisc.classList.add('visible', 'spinning');
      if (DOM.equalizer) DOM.equalizer.classList.add('active');
    } else {
      if (state.currentTrack && DOM.vinylDisc) DOM.vinylDisc.classList.add('visible');
      if (DOM.vinylDisc) DOM.vinylDisc.classList.remove('spinning');
      if (DOM.equalizer) DOM.equalizer.classList.remove('active');
    }
  }
  function drv() { if (DOM.driveOverlay.classList.contains('active')) updateDriveUI(); }

  /* Speedometer */
  function updateSpeedo(pct) {
    if (!DOM.speedoNeedle) return;
    var deg = -60 + (pct / 100) * 270;
    DOM.speedoNeedle.style.transform = 'translateX(-50%) rotate(' + deg + 'deg)';
    if (DOM.speedoGlow) DOM.speedoGlow.style.transform = 'translateX(-50%) rotate(' + deg + 'deg)';
    if (DOM.speedoReadout) DOM.speedoReadout.textContent = Math.round(pct);
  }

  /* Keyboard */
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': AUDIO.currentTime = Math.min((AUDIO.duration || 0), AUDIO.currentTime + 5); break;
      case 'ArrowLeft': AUDIO.currentTime = Math.max(0, AUDIO.currentTime - 5); break;
      case 'ArrowUp': e.preventDefault(); var vu = Math.min(1, AUDIO.volume + 0.05); AUDIO.volume = vu; DOM.volumeFill.style.width = (vu*100)+'%'; state.isMuted = false; updateVolumeIcon(vu); break;
      case 'ArrowDown': e.preventDefault(); var vd = Math.max(0, AUDIO.volume - 0.05); AUDIO.volume = vd; DOM.volumeFill.style.width = (vd*100)+'%'; state.isMuted = false; updateVolumeIcon(vd); break;
      case 'KeyN': nextTrack(); break;
      case 'KeyS': prevTrack(); break;
      case 'KeyM': DOM.volumeBtn.click(); break;
    }
  });

  
});
