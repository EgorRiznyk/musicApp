var CONFIG = { MAX_RESULTS: 20 };

/* Invidious instances (YouTube proxy, not blocked in РФ) */
var INV = ['inv.tux.pizza','yewtu.be','invidious.nerdvpn.de','invidious.privacydev.net','invidious.snopyta.org'];

/* Hybrid: Invidious (full songs via <video>) + iTunes fallback (30s) */
var AUDIO = {
  _a: new Audio(),
  _v: null,
  _mode: 'audio',
  _invPlaying: false,
  _vol: 0.7, _dur: 0, _ct: 0, _ls: {},
  _fbTimer: null, _invInst: null,

  init: function() {
    var s = this;
    s._a.preload = 'auto';

    var v = document.createElement('video');
    v.id = 'invPlayer'; v.preload = 'auto'; v.muted = true; v.playsInline = true;
    v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(v);
    s._v = v;

    v.addEventListener('play',function(){if(s._mode==='inv')s._fire('play');});
    v.addEventListener('pause',function(){if(s._mode==='inv')s._fire('pause');});
    v.addEventListener('ended',function(){s._invPlaying=false;s._mode='audio';s._a.volume=s._vol;s._fire('ended');});
    v.addEventListener('timeupdate',function(){if(s._mode==='inv'){s._ct=v.currentTime;s._dur=v.duration;s._fire('timeupdate');}});
    v.addEventListener('loadedmetadata',function(){if(s._mode==='inv')s._fire('loadedmetadata');});
    v.addEventListener('error',function(){if(s._mode==='inv'){s._mode='audio';s._a.volume=s._vol;s._a.play();}});

    s._a.addEventListener('play',function(){if(s._mode==='audio')s._fire('play');});
    s._a.addEventListener('pause',function(){if(s._mode==='audio')s._fire('pause');});
    s._a.addEventListener('ended',function(){if(s._mode==='audio')s._fire('ended');});
    s._a.addEventListener('timeupdate',function(){if(s._mode==='audio'){s._ct=s._a.currentTime;s._dur=s._a.duration;s._fire('timeupdate');}});
    s._a.addEventListener('loadedmetadata',function(){if(s._mode==='audio')s._fire('loadedmetadata');});
    s._a.addEventListener('error',function(){if(s._mode==='audio')s._fire('error');});

    /* Попробовать найти работающий Invidious инстанс в фоне */
    s._ping(0);
  },

  _ping:function(i){var s=this;if(i>=INV.length)return;
    fetch('https://'+INV[i]+'/api/v1/search?q=test&fields=videoId&limit=1').then(function(r){if(r.ok){s._invInst=INV[i];}}).catch(function(){s._ping(i+1);});
  },

  playTrack: function(url, track) {
    var s = this;
    if (s._fbTimer) clearTimeout(s._fbTimer);
    s._mode = 'audio';
    s._a.volume = s._vol;
    s._a.src = url;
    s._a.play().catch(function() {});
    if (track && s._invInst) s._invSearch(track);
  },

  _invSearch: function(track) {
    var s = this, q = encodeURIComponent(track.channel + ' - ' + track.title);
    fetch('https://'+s._invInst+'/api/v1/search?q='+q+'&fields=videoId&limit=1')
      .then(function(r){return r.json();})
      .then(function(d){
        if(d&&d.length>0&&d[0].videoId)s._invPlay(d[0].videoId);
      }).catch(function(){});
  },

  _invPlay: function(videoId) {
    var s = this;
    s._v.muted = true;
    s._v.src = 'https://'+s._invInst+'/latest_version?id='+videoId+'&itag=18';
    s._v.play().then(function(){
      s._mode='inv';s._invPlaying=true;s._a.volume=0;
      setTimeout(function(){if(s._mode==='inv'){s._v.muted=false;s._v.volume=s._vol;s._fire('play');s._fire('loadedmetadata');}},800);
    }).catch(function(){});
  },

  /* HTMLAudioElement interface */
  get paused(){return this._mode==='inv'?!this._invPlaying:this._a.paused;},
  get duration(){return this._mode==='inv'&&this._dur?this._dur:(this._a.duration||0);},
  get currentTime(){return this._mode==='inv'?this._ct:this._a.currentTime;},
  set currentTime(t){if(this._mode==='inv')this._v.currentTime=t;else this._a.currentTime=t;},
  get volume(){return this._vol;},
  set volume(v){this._vol=v;if(this._mode==='inv')this._v.volume=v;this._a.volume=v;},
  get src(){return this._a.src||'';},
  set src(v){this._a.src=v;},
  play:function(){if(this._mode==='inv')this._v.play();else this._a.play();return Promise.resolve();},
  pause:function(){if(this._mode==='inv')this._v.pause();else this._a.pause();},
  addEventListener:function(ev,fn){if(!this._ls[ev])this._ls[ev]=[];this._ls[ev].push(fn);},
  _fire:function(ev){(this._ls[ev]||[]).forEach(function(fn){fn();});},
};

AUDIO.init();

var state = {
  currentTrack: null,
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  previousVolume: 70,
  isMuted: false,
};

var DOM = {};

function cacheDOM() {
  var ids = [
    'sidebar', 'menuToggle', 'searchInput', 'searchBtn',
    'results', 'heroSection', 'browseSection', 'resultsGrid', 'resultsCount',
    'resultsBack', 'genreChips',
    'favResults', 'favResultsGrid', 'favBack', 'sidebarFavorites', 'favBtn',
    'newReleasesRow', 'trendingRow', 'moodRow',
    'playerBar', 'playerThumb', 'playerTitle', 'playerChannel',
    'vinylDisc', 'equalizer',
    'playBtn', 'prevBtn', 'nextBtn', 'shuffleBtn', 'repeatBtn',
    'progressBar', 'progressFill', 'currentTime', 'totalTime',
    'volumeSlider', 'volumeFill', 'volumeBtn',
    'spinner',
    'playlistDrawer', 'drawerOverlay', 'drawerList', 'drawerClose', 'playlistBtn',
    'driveOverlay', 'driveBtn', 'driveExit', 'driveThumb', 'driveTrackTitle', 'driveTrackChannel',
    'drivePlay', 'drivePrev', 'driveNext', 'driveFav', 'driveShuffle', 'driveTime',
    'speedoNeedle',
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

function formatDuration(duration) {
  var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  var h = parseInt(match[1]) || 0;
  var m = parseInt(match[2]) || 0;
  var s = parseInt(match[3]) || 0;
  if (h > 0) return h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  return m + ':' + s.toString().padStart(2, '0');
}

function truncate(str, len) {
  len = len || 50;
  return str.length > len ? str.slice(0, len) + '...' : str;
}

/* Shimmer skeletons */
function showSkeleton(container, count) {
  container.innerHTML = '';
  for (var i = 0; i < count; i++) {
    var el = document.createElement('div');
    el.className = 'skeleton-card';
    el.innerHTML = '<div class="skeleton-thumb"></div><div class="skeleton-line"></div><div class="skeleton-line"></div>';
    container.appendChild(el);
  }
}

/* Favorites */
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('favorites')) || []; }
  catch(e) { return []; }
}

function isFavorite(id) {
  return getFavorites().some(function(t) { return t.id === id; });
}

function toggleFavorite(track) {
  var favs = getFavorites();
  var idx = favs.findIndex(function(t) { return t.id === track.id; });
  if (idx > -1) {
    favs.splice(idx, 1);
  } else {
    favs.unshift({ id: track.id, title: track.title, channel: track.channel, thumb: track.thumb, duration: track.duration });
  }
  localStorage.setItem('favorites', JSON.stringify(favs));
  updateFavBtn(track.id);
  if (DOM.driveFav) {
    DOM.driveFav.classList.toggle('active', isFavorite(track.id));
    DOM.driveFav.innerHTML = isFavorite(track.id) ? '<i class="fas fa-heart"></i> В избранном' : '<i class="far fa-heart"></i> В избранное';
  }
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
    return;
  }
  items.forEach(function(item, index) {
    var card = document.createElement('div');
    card.className = 'track-card';
    card.style.animationDelay = (index * 0.04) + 's';
    card.innerHTML = '<div class="track-card-thumb"><img src="' + item.thumb + '" alt="" loading="lazy" /><div class="track-card-overlay"><button class="track-card-play"><i class="fas fa-play"></i></button></div><span class="track-card-duration">' + (item.duration || '0:00') + '</span></div><div class="track-card-title">' + truncate(item.title, 30) + '</div><div class="track-card-channel">' + item.channel + '</div></div>';
    card.addEventListener('click', function() { playTrack(index, items); });
    DOM.favResultsGrid.appendChild(card);
  });
  DOM.favResults.style.display = 'block';
  DOM.heroSection.style.display = 'none';
  DOM.browseSection.style.display = 'none';
  DOM.results.style.display = 'none';
}

/* Recent tracks */
function getRecentTracks() {
  try { return JSON.parse(localStorage.getItem('recentTracks')) || []; }
  catch(e) { return []; }
}

function saveRecentTrack(track) {
  var tracks = getRecentTracks();
  tracks = tracks.filter(function(t) { return t.id !== track.id; });
  tracks.unshift({ id: track.id, title: track.title, channel: track.channel, thumb: track.thumb });
  if (tracks.length > 20) tracks.length = 20;
  localStorage.setItem('recentTracks', JSON.stringify(tracks));
  renderRecentTracks();
}

function renderRecentTracks() {
  var tracks = getRecentTracks();
  var list = document.querySelector('.playlist-list');
  if (!list) return;
  var html = '';
  tracks.slice(0, 5).forEach(function(t) {
    html += '<a href="#" class="playlist-item recent-item" data-id="' + t.id + '"><i class="fas fa-clock"></i> ' + truncate(t.title, 20) + '</a>';
  });
  var label = list.querySelector('.sidebar-label');
  var items = list.querySelectorAll('.playlist-item:not(.recent-item)');
  list.innerHTML = '';
  if (label) list.appendChild(label);
  items.forEach(function(el) { list.appendChild(el); });
  if (tracks.length > 0) {
    var recentLabel = document.createElement('p');
    recentLabel.className = 'sidebar-label';
    recentLabel.textContent = 'Недавние';
    list.appendChild(recentLabel);
    var recentDiv = document.createElement('div');
    recentDiv.className = 'recent-list';
    recentDiv.innerHTML = html;
    list.appendChild(recentDiv);
    recentDiv.querySelectorAll('.recent-item').forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        var id = item.dataset.id;
        var found = getRecentTracks().find(function(t) { return t.id === id; });
        if (found) {
          DOM.searchInput.value = found.title;
          performSearch();
        }
      });
    });
  }
}

/* iTunes Search via JSONP (works from file://, no CORS, no API key) */
function itunesSearch(query, limit) {
  limit = limit || CONFIG.MAX_RESULTS;
  return new Promise(function(resolve) {
    var cb = 'itcb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var script = document.createElement('script');
    window[cb] = function(data) {
      delete window[cb];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve((data.results || []).map(function(item) {
        return {
          id: 'it_' + item.trackId,
          title: item.trackName,
          channel: item.artistName,
          album: item.collectionName || '',
          thumb: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '300x300') : '',
          duration: item.trackTimeMillis ? formatTime(item.trackTimeMillis / 1000) : '0:00',
          preview: item.previewUrl || '',
        };
      }));
    };
    script.src = 'https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&media=music&entity=song&limit=' + limit + '&callback=' + cb;
    document.body.appendChild(script);
    setTimeout(function() {
      if (window[cb]) {
        delete window[cb];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve([]);
      }
    }, 8000);
  });
}

/* Main search: iTunes */
async function searchMusic(query, limit) {
  showSpinner();
  var items = await itunesSearch(query, limit);
  hideSpinner();
  return items;
}

function renderRow(container, items) {
  container.innerHTML = '';
  items.forEach(function(item, index) {
    var card = document.createElement('div');
    card.className = 'row-card';
    card.style.animationDelay = (index * 0.04) + 's';
    card.innerHTML = '<div class="row-card-thumb"><img src="' + item.thumb + '" alt="" loading="lazy" /><div class="row-card-overlay"><button class="row-card-play"><i class="fas fa-play"></i></button></div><span class="row-card-duration">' + item.duration + '</span></div><div class="row-card-title" title="' + item.title.replace(/"/g, '&quot;') + '">' + truncate(item.title, 28) + '</div><div class="row-card-channel">' + item.channel + '</div>';
    card.addEventListener('click', function() { playTrack(index, items); });
    container.appendChild(card);
  });
}

function renderResults(items) {
  DOM.resultsGrid.innerHTML = '';
  if (items.length === 0) {
    DOM.resultsGrid.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>Ничего не найдено</p></div>';
    DOM.resultsCount.textContent = '0';
    return;
  }
  DOM.resultsCount.textContent = items.length + ' результатов';
  DOM.results.style.display = 'block';
  DOM.heroSection.style.display = 'none';
  DOM.browseSection.style.display = 'none';
  items.forEach(function(item, index) {
    var card = document.createElement('div');
    card.className = 'track-card';
    card.style.animationDelay = (index * 0.04) + 's';
    card.innerHTML = '<div class="track-card-thumb"><img src="' + item.thumb + '" alt="" loading="lazy" /><div class="track-card-overlay"><button class="track-card-play"><i class="fas fa-play"></i></button></div><span class="track-card-duration">' + item.duration + '</span></div><div class="track-card-title" title="' + item.title.replace(/"/g, '&quot;') + '">' + truncate(item.title, 30) + '</div><div class="track-card-channel">' + item.channel + '</div>';
    card.addEventListener('click', function() { playTrack(index, items); });
    DOM.resultsGrid.appendChild(card);
  });
}

function showHome() {
  DOM.results.style.display = 'none';
  DOM.heroSection.style.display = '';
  DOM.browseSection.style.display = '';
  DOM.searchInput.value = '';
}
/* Hybrid play: iTunes preview instantly + YouTube in background */
function initAudioPlayer(url, track) {
  if (!url) { skipTrack(); return; }
  AUDIO._userActivated = true;
  AUDIO.playTrack(url, track);
  state.isPlaying = true;
  DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  DOM.totalTime.textContent = '0:00';
}

function skipTrack() {
  var n = getNextIndex();
  if (n !== state.currentIndex) playNext();
}

function highlightCards(index, selector) {
  document.querySelectorAll(selector).forEach(function(card, i) {
    card.style.background = i === index ? 'var(--bg-hover)' : '';
  });
}

async function playTrack(index, items) {
  var track = items[index];
  if (!track) return;
  state.currentIndex = index;
  state.playlist = items;

  AUDIO.pause();
  AUDIO.src = '';

  state.currentTrack = track;
  DOM.playerThumb.style.backgroundImage = 'url(' + track.thumb + ')';
  DOM.playerTitle.textContent = track.title;
  DOM.playerChannel.textContent = track.channel;
  DOM.playerBar.style.display = 'flex';
  DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
  DOM.progressFill.style.width = '0%';
  DOM.currentTime.textContent = '0:00';

  initAudioPlayer(track.preview || '', track);

  highlightCards(index, '.track-card');
  highlightCards(index, '.row-card');
  updateDrawer();
}

function togglePlay() {
  if (AUDIO.paused && AUDIO.src) { AUDIO.play(); state.isPlaying = true; DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
  else if (!AUDIO.paused) { AUDIO.pause(); state.isPlaying = false; DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>'; }
}

function getNextIndex() {
  if (state.isShuffle) {
    var idx;
    do { idx = Math.floor(Math.random() * state.playlist.length); }
    while (idx === state.currentIndex && state.playlist.length > 1);
    return idx;
  }
  return (state.currentIndex + 1) % state.playlist.length;
}

function getPrevIndex() {
  if (AUDIO.currentTime > 3) { AUDIO.currentTime = 0; return -1; }
  if (state.isShuffle) return Math.floor(Math.random() * state.playlist.length);
  return (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
}

function playNext() {
  if (state.playlist.length === 0) return;
  if (state.isRepeat) { AUDIO.currentTime = 0; AUDIO.play(); return; }
  playTrack(getNextIndex(), state.playlist);
}

function playPrev() {
  if (state.playlist.length === 0) return;
  var idx = getPrevIndex();
  if (idx === -1) return;
  playTrack(idx, state.playlist);
}

function updateDrawer() {
  if (state.playlist.length === 0) {
    DOM.drawerList.innerHTML = '<p class="drawer-empty">Плейлист пуст</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < state.playlist.length; i++) {
    var t = state.playlist[i];
    var active = i === state.currentIndex;
    html += '<div class="drawer-item' + (active ? ' active' : '') + '" data-index="' + i + '"><div class="drawer-item-thumb" style="background-image:url(' + t.thumb + ')"></div><div class="drawer-item-info"><div class="drawer-item-title">' + truncate(t.title, 30) + '</div><div class="drawer-item-channel">' + t.channel + '</div></div>' + (active ? '<div class="drawer-item-current">Сейчас</div>' : '') + '</div>';
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

async function performSearch() {
  var query = DOM.searchInput.value.trim();
  if (!query) return;
  state.playlist = [];
  var items = await searchMusic(query);
  if (items.length > 0) { renderResults(items); }
  else {
    DOM.resultsGrid.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>Ничего не найдено</p></div>';
    DOM.results.style.display = 'block';
    DOM.heroSection.style.display = 'none';
    DOM.browseSection.style.display = 'none';
    DOM.resultsCount.textContent = '0';
  }
}

async function initBrowse() {
  showSkeleton(DOM.newReleasesRow, 6);
  showSkeleton(DOM.trendingRow, 6);
  showSkeleton(DOM.moodRow, 6);

  var items = await itunesSearch('поп музыка', 12);
  if (items.length > 0) renderRow(DOM.newReleasesRow, items);
  items = await itunesSearch('хиты 2026', 12);
  if (items.length > 0) renderRow(DOM.trendingRow, items);
  items = await itunesSearch('lofi chill', 12);
  if (items.length > 0) renderRow(DOM.moodRow, items);
}

document.addEventListener('DOMContentLoaded', function() {
  cacheDOM();

  /* Favorites */
  DOM.favBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (state.currentTrack) toggleFavorite(state.currentTrack);
  });

  DOM.sidebarFavorites.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    renderFavorites();
  });

  DOM.favBack.addEventListener('click', function() {
    DOM.favResults.style.display = 'none';
    showHome();
  });

  /* Speedometer needle */
  function updateSpeedo(vol) {
    if (!DOM.speedoNeedle) return;
    DOM.speedoNeedle.style.transform = 'translateX(-50%) rotate(' + (-60 + (vol / 100) * 120) + 'deg)';
  }

  /* Driving Mode */
  function enterDriveMode() {
    DOM.driveOverlay.classList.add('active');
    updateDriveUI();
  }

  function updateDriveUI() {
    if (state.currentTrack) {
      DOM.driveThumb.style.backgroundImage = 'url(' + state.currentTrack.thumb + ')';
      DOM.driveTrackTitle.textContent = state.currentTrack.title;
      DOM.driveTrackChannel.textContent = state.currentTrack.channel;
      DOM.drivePlay.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      DOM.driveFav.classList.toggle('active', isFavorite(state.currentTrack.id));
    } else {
      DOM.driveThumb.style.background = '';
      DOM.driveThumb.style.backgroundColor = 'var(--bg-elevated)';
      DOM.driveTrackTitle.textContent = 'Нет трека';
      DOM.driveTrackChannel.textContent = '';
      DOM.drivePlay.innerHTML = '<i class="fas fa-play"></i>';
    }
    DOM.driveTime.textContent = formatTime(AUDIO.currentTime || 0) + ' / ' + formatTime(AUDIO.duration || 0);
    DOM.driveShuffle.style.color = state.isShuffle ? 'var(--accent)' : '';
  }

  DOM.driveBtn.addEventListener('click', enterDriveMode);
  DOM.driveExit.addEventListener('click', function() { DOM.driveOverlay.classList.remove('active'); });
  DOM.drivePlay.addEventListener('click', togglePlay);
  DOM.drivePrev.addEventListener('click', playPrev);
  DOM.driveNext.addEventListener('click', playNext);
  DOM.driveFav.addEventListener('click', function() {
    if (state.currentTrack) {
      toggleFavorite(state.currentTrack);
      DOM.driveFav.classList.toggle('active', isFavorite(state.currentTrack.id));
    }
  });
  DOM.driveShuffle.addEventListener('click', function() {
    state.isShuffle = !state.isShuffle;
    DOM.driveShuffle.style.color = state.isShuffle ? 'var(--accent)' : '';
    DOM.shuffleBtn.style.color = state.isShuffle ? 'var(--accent)' : '';
  });

  DOM.menuToggle.addEventListener('click', function() { DOM.sidebar.classList.toggle('open'); });

  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!DOM.sidebar.contains(e.target) && e.target !== DOM.menuToggle && !DOM.menuToggle.contains(e.target)) {
        DOM.sidebar.classList.remove('open');
      }
    }
  });

  DOM.playBtn.addEventListener('click', togglePlay);
  DOM.prevBtn.addEventListener('click', playPrev);
  DOM.nextBtn.addEventListener('click', playNext);
  DOM.shuffleBtn.addEventListener('click', function() {
    state.isShuffle = !state.isShuffle;
    DOM.shuffleBtn.style.color = state.isShuffle ? 'var(--accent)' : '';
  });
  DOM.repeatBtn.addEventListener('click', function() {
    state.isRepeat = !state.isRepeat;
    DOM.repeatBtn.style.color = state.isRepeat ? 'var(--accent)' : '';
  });

  var debounceTimer;
  DOM.searchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      if (DOM.searchInput.value.trim().length > 2) performSearch();
    }, 400);
  });
  DOM.searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') performSearch(); });
  DOM.searchBtn.addEventListener('click', performSearch);

  DOM.resultsBack.addEventListener('click', showHome);

  /* Keyboard shortcuts */
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': AUDIO.currentTime = Math.min((AUDIO.duration || 0), AUDIO.currentTime + 5); break;
      case 'ArrowLeft': AUDIO.currentTime = Math.max(0, AUDIO.currentTime - 5); break;
      case 'ArrowUp': e.preventDefault(); var vu = Math.min(1, AUDIO.volume + 0.05); AUDIO.volume = vu; DOM.volumeFill.style.width = (vu*100)+'%'; state.isMuted = false; updateVolumeIcon(vu); break;
      case 'ArrowDown': e.preventDefault(); var vd = Math.max(0, AUDIO.volume - 0.05); AUDIO.volume = vd; DOM.volumeFill.style.width = (vd*100)+'%'; state.isMuted = false; updateVolumeIcon(vd); break;
      case 'KeyN': playNext(); break;
      case 'KeyS': playPrev(); break;
      case 'KeyM': DOM.volumeBtn.click(); break;
    }
  });

  var tooltip = document.getElementById('progressTooltip');
  function getDur() { return AUDIO.duration || 0; }
  DOM.progressBar.addEventListener('mousemove', function(e) {
    var d = getDur(); if (!d) return;
    var rect = DOM.progressBar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    tooltip.textContent = formatTime(ratio * d);
    tooltip.style.left = Math.max(0, Math.min(100, ratio * 100)) + '%';
  });
  DOM.progressBar.addEventListener('click', function(e) {
    var d = getDur(); if (!d) return;
    var rect = DOM.progressBar.getBoundingClientRect();
    var t = ((e.clientX - rect.left) / rect.width) * d;
    AUDIO.currentTime = t;
  });

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
  AUDIO.addEventListener('play', function() { state.isPlaying = true; DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>'; viz(); drv(); });
  AUDIO.addEventListener('pause', function() { state.isPlaying = false; DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>'; viz(); drv(); });
  AUDIO.addEventListener('ended', function() { state.isPlaying = false; DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>'; viz(); playNext(); });
  AUDIO.addEventListener('timeupdate', function() {
    if (AUDIO.duration) {
      DOM.progressFill.style.width = (AUDIO.currentTime / AUDIO.duration * 100) + '%';
      DOM.currentTime.textContent = formatTime(AUDIO.currentTime);
      DOM.totalTime.textContent = formatTime(AUDIO.duration);
    }
    if (DOM.driveOverlay.classList.contains('active')) DOM.driveTime.textContent = formatTime(AUDIO.currentTime) + ' / ' + formatTime(AUDIO.duration);
  });
  AUDIO.addEventListener('loadedmetadata', function() { DOM.totalTime.textContent = formatTime(AUDIO.duration) || '0:00'; });
  AUDIO.addEventListener('error', function() { skipTrack(); });

  function viz() {
    var p = !AUDIO.paused && AUDIO.src;
    if (p) { if (DOM.vinylDisc) DOM.vinylDisc.classList.add('visible', 'spinning'); if (DOM.equalizer) DOM.equalizer.classList.add('active'); }
    else { if (state.currentTrack && DOM.vinylDisc) DOM.vinylDisc.classList.add('visible'); if (DOM.vinylDisc) DOM.vinylDisc.classList.remove('spinning'); if (DOM.equalizer) DOM.equalizer.classList.remove('active'); }
  }
  function drv() { if (DOM.driveOverlay.classList.contains('active')) updateDriveUI(); }

  /* Patch playTrack to save recent + update visuals + fav btn */
  var origPlayTrack = playTrack;
  playTrack = async function(index, items) {
    await origPlayTrack(index, items);
    var track = state.currentTrack;
    if (track) { saveRecentTrack(track); updateFavBtn(track.id); }
    viz();
  };

  /* Genre chips */
  DOM.genreChips.addEventListener('click', function(e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    DOM.searchInput.value = chip.dataset.query;
    performSearch();
  });

  document.querySelectorAll('.section-show-all').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var query = btn.dataset.query;
      DOM.searchInput.value = query;
      performSearch();
    });
  });

  initBrowse();
  renderRecentTracks();

  /* Invidious status indicator */
  var invBadge = document.createElement('div');
  invBadge.id = 'invBadge';
  invBadge.style.cssText = 'position:fixed;bottom:80px;right:10px;z-index:999;font-size:11px;background:var(--bg-elevated);color:var(--text-secondary);padding:4px 8px;border-radius:4px;cursor:pointer;font-family:monospace;';
  document.body.appendChild(invBadge);
  function updateInvBadge() {
    if (AUDIO._mode === 'inv') invBadge.textContent = 'INV: ✓ ' + (AUDIO._invInst||'');
    else if (AUDIO._invInst) invBadge.textContent = 'INV: ' + AUDIO._invInst;
    else invBadge.textContent = 'INV: ⏳ ищем...';
  }
  setInterval(updateInvBadge, 3000);
  setTimeout(updateInvBadge, 3000);
});
