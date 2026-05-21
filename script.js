var CONFIG = {
  API_KEY: 'AIzaSyDzaqnyKXTDJO6rMJWTA5JWmSUc_p1kfJg',
  MAX_RESULTS: 20,
};

var state = {
  player: null,
  currentTrack: null,
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  isPlayerReady: false,
  retryCount: 0,
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
    'playerHidden', 'spinner',
    'playlistDrawer', 'drawerOverlay', 'drawerList', 'drawerClose', 'playlistBtn',
    'driveOverlay', 'driveBtn', 'driveExit', 'driveThumb', 'driveTrackTitle', 'driveTrackChannel',
    'drivePlay', 'drivePrev', 'driveNext', 'driveFav',
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

function extractItems(data) {
  return (data.items || []).map(function(item) {
    var id = item.id.videoId || item.id;
    var s = item.snippet;
    return {
      id: id,
      title: s.title,
      channel: s.channelTitle,
      thumb: (s.thumbnails.high ? s.thumbnails.high.url : (s.thumbnails.medium ? s.thumbnails.medium.url : s.thumbnails.default.url)),
      duration: '0:00',
      views: 0,
    };
  });
}

async function fetchStats(items) {
  var ids = items.map(function(i) { return i.id; }).filter(Boolean).join(',');
  if (!ids) return;
  try {
    var url = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=' + ids + '&key=' + CONFIG.API_KEY;
    var res = await fetch(url);
    if (!res.ok) return;
    var data = await res.json();
    var map = {};
    (data.items || []).forEach(function(v) {
      map[v.id] = {
        duration: formatDuration(v.contentDetails ? v.contentDetails.duration : 'PT0S'),
        views: parseInt(v.statistics ? v.statistics.viewCount : 0) || 0,
      };
    });
    items.forEach(function(item) {
      if (map[item.id]) {
        item.duration = map[item.id].duration;
        item.views = map[item.id].views;
      }
    });
  } catch (e) {}
}

async function searchYouTube(query, maxResults) {
  maxResults = maxResults || CONFIG.MAX_RESULTS;
  showSpinner();
  try {
    var url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(query) + '&type=video&videoCategoryId=10&maxResults=' + maxResults + '&key=' + CONFIG.API_KEY;
    var res = await fetch(url);
    if (!res.ok) {
      if (res.status === 403) { alert('API ключ недействителен или превышен лимит.'); return []; }
      throw new Error('Ошибка запроса');
    }
    var data = await res.json();
    var items = extractItems(data);
    if (items.length > 0) await fetchStats(items);
    return items;
  } catch (err) {
    console.error(err);
    return [];
  } finally {
    hideSpinner();
  }
}

async function fetchPopular(maxResults) {
  maxResults = maxResults || 15;
  showSpinner();
  try {
    var url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=10&maxResults=' + maxResults + '&key=' + CONFIG.API_KEY;
    var res = await fetch(url);
    if (!res.ok) return [];
    var data = await res.json();
    return (data.items || []).map(function(item) {
      return {
        id: item.id,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb: (item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : (item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : item.snippet.thumbnails.default.url)),
        duration: formatDuration(item.contentDetails ? item.contentDetails.duration : 'PT0S'),
        views: parseInt(item.statistics ? item.statistics.viewCount : 0) || 0,
      };
    });
  } catch (err) {
    return [];
  } finally {
    hideSpinner();
  }
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

function loadYouTubeAPI() {
  return new Promise(function(resolve) {
    if (window.YT && window.YT.Player) { resolve(); return; }
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    var first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(tag, first);
    window.onYouTubeIframeAPIReady = resolve;
  });
}

function initPlayer(videoId) {
  if (state.player) { state.player.loadVideoById(videoId); return; }
  loadYouTubeAPI().then(function() {
    state.player = new YT.Player(DOM.playerHidden, {
      height: '0', width: '0', videoId: videoId,
      playerVars: {
        autoplay: 1, controls: 0, disablekb: 1, fs: 0,
        iv_load_policy: 3, modestbranding: 1, rel: 0, enablejsapi: 1,
      },
      events: {
        onReady: function(e) {
          state.isPlayerReady = true;
          e.target.playVideo();
          DOM.totalTime.textContent = formatTime(e.target.getDuration());
        },
        onStateChange: function(e) {
          if (e.data === YT.PlayerState.PLAYING) {
            state.isPlaying = true;
            DOM.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            DOM.totalTime.textContent = formatTime(e.target.getDuration());
            updatePlayerVisuals();
            syncDriveMode();
          } else if (e.data === YT.PlayerState.PAUSED) {
            state.isPlaying = false;
            DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            updatePlayerVisuals();
            syncDriveMode();
          } else if (e.data === YT.PlayerState.ENDED) {
            state.isPlaying = false;
            DOM.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            updatePlayerVisuals();
            syncDriveMode();
            playNext();
          } else if (e.data === YT.PlayerState.CUED) {
            state.player.playVideo();
          }
        },
        onError: function(e) {
          if (state.retryCount < 2) {
            state.retryCount++;
            setTimeout(function() { if (state.player) state.player.playVideo(); }, 1000);
          } else {
            state.retryCount = 0;
            playNext();
          }
        },
      },
    });
  });
}

function highlightCards(index, selector) {
  document.querySelectorAll(selector).forEach(function(card, i) {
    card.style.background = i === index ? 'var(--bg-hover)' : '';
  });
}

function playTrack(index, items) {
  var track = items[index];
  if (!track) return;
  state.currentIndex = index;
  state.playlist = items;
  state.retryCount = 0;
  state.currentTrack = track;
  DOM.playerThumb.style.backgroundImage = 'url(' + track.thumb + ')';
  DOM.playerTitle.textContent = track.title;
  DOM.playerChannel.textContent = track.channel;
  DOM.playerBar.style.display = 'flex';
  initPlayer(track.id);
  highlightCards(index, '.track-card');
  highlightCards(index, '.row-card');
  updateDrawer();
}

function togglePlay() {
  if (!state.player || !state.isPlayerReady) return;
  if (state.isPlaying) { state.player.pauseVideo(); }
  else { state.player.playVideo(); }
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
  if (state.player && state.player.getCurrentTime() > 3) { state.player.seekTo(0); return -1; }
  if (state.isShuffle) return Math.floor(Math.random() * state.playlist.length);
  return (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
}

function playNext() {
  if (state.playlist.length === 0) return;
  if (state.isRepeat) { state.player.seekTo(0); state.player.playVideo(); return; }
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
  var items = await searchYouTube(query);
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

  var newItems = await searchYouTube('новинки музыки 2026', 12);
  if (newItems.length > 0) renderRow(DOM.newReleasesRow, newItems);

  var trendingItems = await fetchPopular(12);
  if (trendingItems.length > 0) renderRow(DOM.trendingRow, trendingItems);

  var moodItems = await searchYouTube('музыка для души', 12);
  if (moodItems.length > 0) renderRow(DOM.moodRow, moodItems);
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

  /* Driving Mode */
  function enterDriveMode() {
    DOM.driveOverlay.classList.add('active');
    if (state.currentTrack) {
      DOM.driveThumb.style.backgroundImage = 'url(' + state.currentTrack.thumb + ')';
      DOM.driveTrackTitle.textContent = state.currentTrack.title;
      DOM.driveTrackChannel.textContent = state.currentTrack.channel;
      DOM.drivePlay.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      DOM.driveFav.classList.toggle('active', isFavorite(state.currentTrack.id));
      DOM.driveFav.innerHTML = isFavorite(state.currentTrack.id) ? '<i class="fas fa-heart"></i> В избранном' : '<i class="far fa-heart"></i> В избранное';
    } else {
      DOM.driveThumb.style.background = 'var(--bg-elevated)';
      DOM.driveTrackTitle.textContent = 'Нет трека';
      DOM.driveTrackChannel.textContent = 'Начните воспроизведение';
    }
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
      DOM.driveFav.innerHTML = isFavorite(state.currentTrack.id) ? '<i class="fas fa-heart"></i> В избранном' : '<i class="far fa-heart"></i> В избранное';
    }
  });

  /* Override togglePlay to sync driving mode */
  var prevToggle = togglePlay;
  togglePlay = function() {
    prevToggle();
    setTimeout(syncDriveMode, 50);
  };

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

  var tooltip = document.getElementById('progressTooltip');
  DOM.progressBar.addEventListener('mousemove', function(e) {
    if (!state.player || !state.isPlayerReady) return;
    var rect = DOM.progressBar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    var dur = state.player.getDuration();
    tooltip.textContent = formatTime(ratio * dur);
    tooltip.style.left = Math.max(0, Math.min(100, ratio * 100)) + '%';
  });
  DOM.progressBar.addEventListener('click', function(e) {
    if (!state.player || !state.isPlayerReady) return;
    var rect = DOM.progressBar.getBoundingClientRect();
    state.player.seekTo(((e.clientX - rect.left) / rect.width) * state.player.getDuration());
  });

  DOM.volumeSlider.addEventListener('click', function(e) {
    if (!state.player || !state.isPlayerReady) return;
    var rect = DOM.volumeSlider.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    state.player.setVolume(ratio * 100);
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
    if (!state.player || !state.isPlayerReady) return;
    state.isMuted = !state.isMuted;
    if (state.isMuted) {
      state.previousVolume = state.player.getVolume();
      state.player.setVolume(0);
      DOM.volumeFill.style.width = '0%';
    } else {
      state.player.setVolume(state.previousVolume);
      DOM.volumeFill.style.width = state.previousVolume + '%';
    }
    updateVolumeIcon(state.isMuted ? 0 : state.player.getVolume() / 100);
  });

  DOM.playlistBtn.addEventListener('click', toggleDrawer);
  DOM.drawerClose.addEventListener('click', toggleDrawer);
  DOM.drawerOverlay.addEventListener('click', toggleDrawer);

  setInterval(function() {
    if (state.player && state.isPlayerReady && state.isPlaying) {
      var c = state.player.getCurrentTime();
      var d = state.player.getDuration();
      if (d > 0) DOM.progressFill.style.width = (c / d * 100) + '%';
      DOM.currentTime.textContent = formatTime(c);
    }
  }, 250);

  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
      item.classList.add('active');
      if (item.id === 'navHome') { showHome(); }
      else if (item.id === 'navSearch') { DOM.searchInput.focus(); }
    });
  });

  /* Keyboard shortcuts */
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': if (state.player && state.isPlayerReady) state.player.seekTo(Math.min(state.player.getDuration(), state.player.getCurrentTime() + 5)); break;
      case 'ArrowLeft': if (state.player && state.isPlayerReady) state.player.seekTo(Math.max(0, state.player.getCurrentTime() - 5)); break;
      case 'ArrowUp': e.preventDefault(); if (state.player && state.isPlayerReady) { var v = Math.min(100, state.player.getVolume() + 5); state.player.setVolume(v); DOM.volumeFill.style.width = v + '%'; state.isMuted = false; updateVolumeIcon(v/100); } break;
      case 'ArrowDown': e.preventDefault(); if (state.player && state.isPlayerReady) { var v = Math.max(0, state.player.getVolume() - 5); state.player.setVolume(v); DOM.volumeFill.style.width = v + '%'; state.isMuted = false; updateVolumeIcon(v/100); } break;
      case 'KeyN': playNext(); break;
      case 'KeyS': playPrev(); break;
      case 'KeyM': if (state.player && state.isPlayerReady) { DOM.volumeBtn.click(); } break;
    }
  });

  /* Sync drive mode */
  function syncDriveMode() {
    if (!DOM.driveOverlay.classList.contains('active')) return;
    if (state.currentTrack) {
      DOM.driveThumb.style.backgroundImage = 'url(' + state.currentTrack.thumb + ')';
      DOM.driveTrackTitle.textContent = state.currentTrack.title;
      DOM.driveTrackChannel.textContent = state.currentTrack.channel;
    }
    DOM.drivePlay.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
  }

  /* Vinyl + equalizer toggle */
  function updatePlayerVisuals() {
    if (state.isPlaying) {
      DOM.vinylDisc.classList.add('visible', 'spinning');
      DOM.equalizer.classList.add('active');
    } else {
      if (state.currentTrack) DOM.vinylDisc.classList.add('visible');
      DOM.vinylDisc.classList.remove('spinning');
      DOM.equalizer.classList.remove('active');
    }
  }

  /* Patch togglePlay to update visuals */
  var origToggle = togglePlay;
  togglePlay = function() {
    origToggle();
    setTimeout(updatePlayerVisuals, 100);
  };

  /* Patch playTrack to save recent + update visuals + fav btn */
  var origPlayTrack = playTrack;
  playTrack = function(index, items) {
    origPlayTrack(index, items);
    var track = items[index];
    if (track) {
      saveRecentTrack(track);
      setTimeout(function() { updateFavBtn(track.id); }, 100);
    }
    setTimeout(updatePlayerVisuals, 300);
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
});
