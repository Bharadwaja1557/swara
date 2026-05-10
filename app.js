// ======================================================
// 1. CONFIG
// ======================================================

const APP_NAME = 'swara'

const CONFIG = {
  musicRepo: 'gajala-sonic-solutions/m4a-db',

  albumsUrl:
    'https://cdn.jsdelivr.net/gh/gajala-sonic-solutions/m4a-db@main/data/albums.json',

  cdnBase:
    'https://cdn.jsdelivr.net/gh/gajala-sonic-solutions/m4a-db@main/data',

  releaseBase:
    'https://github.com/gajala-sonic-solutions/m4a-db/releases/download',
}

// ======================================================
// 2. STATE
// ======================================================

const state = {
  albums: [],
  currentAlbum: null,
  queue: [],
  queueIndex: 0,
  originalQueue: [],
  isPlaying: false,
  isShuffled: false,
  repeatMode: 'off',
  currentTime: 0,
  duration: 0,
  likedTrackIds: new Set(),
  recentlyPlayed: [],
  view: 'home',
  fullPlayerOpen: false,
  searchQuery: '',
}

// ======================================================
// 3. LOCAL STORAGE HELPERS
// ======================================================

const STORAGE_KEYS = {
  liked: `${APP_NAME}:liked`,
  recent: `${APP_NAME}:recent`,
}

function saveLiked() {
  localStorage.setItem(
    STORAGE_KEYS.liked,
    JSON.stringify([...state.likedTrackIds])
  )
}

function loadLiked() {
  try {
    const data = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.liked) || '[]'
    )

    state.likedTrackIds = new Set(data)
  } catch {
    state.likedTrackIds = new Set()
  }
}

function saveRecent() {
  localStorage.setItem(
    STORAGE_KEYS.recent,
    JSON.stringify(state.recentlyPlayed)
  )
}

function loadRecent() {
  try {
    state.recentlyPlayed = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.recent) || '[]'
    )
  } catch {
    state.recentlyPlayed = []
  }
}

// ======================================================
// 4. FILENAME PARSER + SELF TEST
// ======================================================

function normalizeText(text) {
  return text.replace(/_/g, ' ')
}

function parseArtists(raw) {
  return raw
    .split('+')
    .map(a => normalizeText(a.trim()))
}

function parseFilename(filename) {
  const clean = filename.replace(/\.m4a$/i, '')

  const parts = clean.split('--')

  if (parts.length !== 3) {
    throw new Error(`Invalid filename format: ${filename}`)
  }

  const [trackRaw, singersRaw, titleRaw] = parts

  return {
    trackNumber: Number(trackRaw),
    title: normalizeText(titleRaw),
    artists: parseArtists(singersRaw),
    artistsDisplay: parseArtists(singersRaw).join(', '),
  }
}

function runParserTests() {
  const tests = [
    {
      input: '01--Arijit_Singh--Tum_Hi_Ho.m4a',
      expected: {
        trackNumber: 1,
        title: 'Tum Hi Ho',
        artistsDisplay: 'Arijit Singh',
      },
    },

    {
      input: '01--A.R_Rahman+Sid_Sriram--The_Life_of_Ram.m4a',
      expected: {
        trackNumber: 1,
        title: 'The Life of Ram',
        artistsDisplay: 'A.R Rahman, Sid Sriram',
      },
    },

    {
      input:
        '12--Shreya_Ghoshal+Udit_Narayan--Dil-E-Nadaan.m4a',

      expected: {
        trackNumber: 12,
        title: 'Dil-E-Nadaan',
        artistsDisplay:
          'Shreya Ghoshal, Udit Narayan',
      },
    },

    {
      input:
        '05--Shankar-Ehsaan-Loy--Dil_Chahta_Hai.m4a',

      expected: {
        trackNumber: 5,
        title: 'Dil Chahta Hai',
        artistsDisplay: 'Shankar-Ehsaan-Loy',
      },
    },

    {
      input:
        '99--K.K--Pal_Pal_Dil_Ke_Paas.m4a',

      expected: {
        trackNumber: 99,
        title: 'Pal Pal Dil Ke Paas',
        artistsDisplay: 'K.K',
      },
    },
  ]

  console.group('swara parser self-test')

  tests.forEach(test => {
    const parsed = parseFilename(test.input)

    const pass =
      parsed.trackNumber === test.expected.trackNumber &&
      parsed.title === test.expected.title &&
      parsed.artistsDisplay ===
        test.expected.artistsDisplay

    console.log(
      `${pass ? 'PASS' : 'FAIL'} | ${test.input}`,
      parsed
    )
  })

  console.groupEnd()
}

// ======================================================
// 5. DATA FETCHING
// ======================================================

async function fetchAlbums() {
  const res = await fetch(CONFIG.albumsUrl)

  const data = await res.json()

  state.albums = data.albums || []

  render()
}

async function fetchAlbumMeta(tag) {
  const url = `${CONFIG.cdnBase}/${tag}.json`

  const res = await fetch(url)

  return await res.json()
}

// ======================================================
// 6. AUDIO ENGINE
// ======================================================

const audio = new Audio()

audio.preload = 'metadata'

audio.addEventListener('timeupdate', () => {
  state.currentTime = audio.currentTime || 0
  updatePlayerProgress()
})

audio.addEventListener('loadedmetadata', () => {
  state.duration = audio.duration || 0
  updatePlayerProgress()
})

audio.addEventListener('play', () => {
  state.isPlaying = true
  renderPlayer()
})

audio.addEventListener('pause', () => {
  state.isPlaying = false
  renderPlayer()
})

audio.addEventListener('ended', () => {
  handleTrackEnd()
})

function playTrack(track) {
  audio.src = track.streamUrl

  audio.play()

  updateMediaSession(track)

  addRecentlyPlayed(track)

  renderPlayer()
}

function playQueueIndex(index) {
  state.queueIndex = index

  const track = state.queue[index]

  playTrack(track)
}

function playAlbum(album, trackIndex = 0) {
  state.currentAlbum = album

  state.queue = [...album.tracks]
  state.originalQueue = [...album.tracks]
  state.queueIndex = trackIndex

  playQueueIndex(trackIndex)
}

function togglePlayPause() {
  if (!audio.src) return

  if (audio.paused) {
    audio.play()
  } else {
    audio.pause()
  }
}

function nextTrack() {
  if (state.repeatMode === 'one') {
    audio.currentTime = 0
    audio.play()
    return
  }

  if (state.queueIndex < state.queue.length - 1) {
    playQueueIndex(state.queueIndex + 1)
    return
  }

  if (state.repeatMode === 'all') {
    playQueueIndex(0)
    return
  }

  audio.pause()
}

function prevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0
    return
  }

  if (state.queueIndex > 0) {
    playQueueIndex(state.queueIndex - 1)
  }
}

function handleTrackEnd() {
  nextTrack()
}

function seekTo(value) {
  audio.currentTime = value
}

function toggleShuffle() {
  state.isShuffled = !state.isShuffled

  const currentTrack =
    state.queue[state.queueIndex]

  if (state.isShuffled) {
    const remaining =
      state.queue.filter(
        t => t.id !== currentTrack.id
      )

    remaining.sort(() => Math.random() - 0.5)

    state.queue = [currentTrack, ...remaining]
    state.queueIndex = 0
  } else {
    state.queue = [...state.originalQueue]

    state.queueIndex = state.queue.findIndex(
      t => t.id === currentTrack.id
    )
  }

  renderPlayer()
}

function cycleRepeatMode() {
  const modes = ['off', 'all', 'one']

  const current =
    modes.indexOf(state.repeatMode)

  state.repeatMode =
    modes[(current + 1) % modes.length]

  renderPlayer()
}

// ======================================================
// 7. MEDIA SESSION API
// ======================================================

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return

  navigator.mediaSession.metadata =
    new MediaMetadata({
      title: track.title,
      artist: track.artistsDisplay,
      album:
        state.currentAlbum?.title || '',
      artwork: [
        {
          src:
            state.currentAlbum?.coverUrl || '',
          sizes: '512x512',
          type: 'image/webp',
        },
      ],
    })

  navigator.mediaSession.setActionHandler(
    'play',
    () => audio.play()
  )

  navigator.mediaSession.setActionHandler(
    'pause',
    () => audio.pause()
  )

  navigator.mediaSession.setActionHandler(
    'previoustrack',
    prevTrack
  )

  navigator.mediaSession.setActionHandler(
    'nexttrack',
    nextTrack
  )
}

// ======================================================
// 8. RENDER FUNCTIONS
// ======================================================

const mainContent =
  document.getElementById('mainContent')

const playerBar =
  document.getElementById('playerBar')

const fullscreenPlayer =
  document.getElementById(
    'fullscreenPlayer'
  )

function render() {
  if (state.searchQuery.trim()) {
    renderSearch()
    return
  }

  if (state.view === 'liked') {
    renderLiked()
    return
  }

  if (
    state.view === 'album' &&
    state.currentAlbum
  ) {
    renderAlbumView()
    return
  }

  renderHome()
}

function renderHome() {
  const recentHtml =
    state.recentlyPlayed.length > 0
      ? `
      <section class="recent-section">
        <h2 class="section-title">
          Recently Played
        </h2>

        <div class="track-list">
          ${state.recentlyPlayed
            .map(trackRowHTML)
            .join('')}
        </div>
      </section>
    `
      : ''

  mainContent.innerHTML = `
    ${recentHtml}

    <section>
      <h2 class="section-title">
        Albums
      </h2>

      <div class="album-grid">
        ${state.albums
          .map(albumCardHTML)
          .join('')}
      </div>
    </section>
  `
}

function renderAlbumView() {
  const album = state.currentAlbum

  mainContent.innerHTML = `
    <div class="album-view-header">
      <button
        class="back-btn"
        data-action="go-home"
      >
        ← Back
      </button>

      <div class="album-hero">
        ${
          album.coverUrl
            ? `
          <img
            class="album-hero-cover"
            src="${album.coverUrl}"
            alt="${album.title}"
          />
        `
            : `
          <div class="album-hero-cover album-cover-placeholder">
            ♪
          </div>
        `
        }

        <div class="album-hero-info">
          <h2 class="album-hero-title">
            ${album.title}
          </h2>

          <p class="album-hero-meta">
            ${album.primaryArtist}<br>
            ${album.year}<br>
            ${album.trackCount} tracks
          </p>
        </div>
      </div>
    </div>

    <div class="track-list">
      ${album.tracks
        .map((track, index) =>
          trackRowHTML(track, index)
        )
        .join('')}
    </div>
  `
}

function renderLiked() {
  const tracks = []

  state.albums.forEach(album => {
    if (!album.tracks) return

    album.tracks.forEach(track => {
      if (
        state.likedTrackIds.has(track.id)
      ) {
        tracks.push(track)
      }
    })
  })

  mainContent.innerHTML = `
    <button
      class="back-btn"
      data-action="go-home"
    >
      ← Back
    </button>

    <h2 class="section-title">
      Liked Songs
    </h2>

    ${
      tracks.length
        ? `
      <div class="track-list">
        ${tracks
          .map(trackRowHTML)
          .join('')}
      </div>
    `
        : `
      <div class="empty-state">
        No liked songs yet.
      </div>
    `
    }
  `
}

function renderSearch() {
  const q =
    state.searchQuery.toLowerCase()

  const albums = []

  state.albums.forEach(album => {
    const albumMatch =
      album.title
        .toLowerCase()
        .includes(q) ||
      album.primaryArtist
        .toLowerCase()
        .includes(q)

    let trackMatch = false

    if (album.tracks) {
      trackMatch = album.tracks.some(
        track =>
          track.title
            .toLowerCase()
            .includes(q) ||
          track.artistsDisplay
            .toLowerCase()
            .includes(q)
      )
    }

    if (albumMatch || trackMatch) {
      albums.push(album)
    }
  })

  mainContent.innerHTML = `
    <h2 class="section-title">
      Search Results
    </h2>

    <div class="album-grid">
      ${albums.map(albumCardHTML).join('')}
    </div>
  `
}

function albumCardHTML(album) {
  return `
    <div
      class="album-card"
      data-action="open-album"
      data-album-id="${album.id}"
    >
      ${
        album.coverUrl
          ? `
        <img
          class="album-cover"
          src="${album.coverUrl}"
          alt="${album.title}"
        />
      `
          : `
        <div class="album-cover-placeholder">
          ♪
        </div>
      `
      }

      <div class="album-body">
        <h3 class="album-title">
          ${album.title}
        </h3>

        <p class="album-meta">
          ${album.primaryArtist}<br>
          ${album.year}
        </p>
      </div>
    </div>
  `
}

function trackRowHTML(track, index = 0) {
  const liked =
    state.likedTrackIds.has(track.id)

  return `
    <div
      class="track-row"
      data-action="play-track"
      data-track-id="${track.id}"
    >
      <div class="track-number">
        ${String(
          track.trackNumber || index + 1
        ).padStart(2, '0')}
      </div>

      <div class="track-main">
        <p class="track-title">
          ${track.title}
        </p>

        <p class="track-artists">
          ${track.artistsDisplay}
        </p>
      </div>

      <div class="track-actions">
        <button
          class="icon-btn ${
            liked ? 'active' : ''
          }"
          data-action="toggle-like"
          data-track-id="${track.id}"
        >
          ♥
        </button>
      </div>
    </div>
  `
}

function renderPlayer() {
  const track =
    state.queue[state.queueIndex]

  if (!track) {
    playerBar.innerHTML = ''
    fullscreenPlayer.innerHTML = ''
    return
  }

  playerBar.innerHTML = `
    <div class="player-bar">
      <div class="player-progress">
        <div
          class="player-progress-fill"
          style="width: ${
            state.duration
              ? (state.currentTime /
                  state.duration) *
                100
              : 0
          }%"
        ></div>
      </div>

      <div
        class="player-bar-content"
        data-action="open-full-player"
      >
        ${
          state.currentAlbum?.coverUrl
            ? `
          <img
            class="player-cover"
            src="${state.currentAlbum.coverUrl}"
          />
        `
            : `
          <div class="player-cover album-cover-placeholder">
            ♪
          </div>
        `
        }

        <div class="player-meta">
          <p class="player-title">
            ${track.title}
          </p>

          <p class="player-artists">
            ${track.artistsDisplay}
          </p>
        </div>

        <div class="player-controls">
          <button
            class="player-play-btn"
            data-action="toggle-play"
          >
            ${
              state.isPlaying
                ? '❚❚'
                : '▶'
            }
          </button>
        </div>
      </div>
    </div>
  `

  renderFullscreenPlayer()
}

function renderFullscreenPlayer() {
  const track =
    state.queue[state.queueIndex]

  if (!track) return

  fullscreenPlayer.classList.toggle(
    'hidden',
    !state.fullPlayerOpen
  )

  fullscreenPlayer.innerHTML = `
    <div class="fullscreen-player-header">
      <button
        class="icon-btn"
        data-action="close-full-player"
      >
        ↓
      </button>

      <button
        class="icon-btn ${
          state.likedTrackIds.has(track.id)
            ? 'active'
            : ''
        }"
        data-action="toggle-like"
        data-track-id="${track.id}"
      >
        ♥
      </button>
    </div>

    ${
      state.currentAlbum?.coverUrl
        ? `
      <img
        class="fullscreen-cover"
        src="${state.currentAlbum.coverUrl}"
      />
    `
        : `
      <div class="fullscreen-cover album-cover-placeholder">
        ♪
      </div>
    `
    }

    <div class="fullscreen-meta">
      <h2 class="fullscreen-title">
        ${track.title}
      </h2>

      <p class="fullscreen-artists">
        ${track.artistsDisplay}
      </p>
    </div>

    <div class="seek-wrap">
      <input
        class="seekbar"
        type="range"
        min="0"
        max="${state.duration || 0}"
        value="${state.currentTime || 0}"
        data-action="seek"
      />

      <div class="time-row">
        <span>
          ${formatTime(state.currentTime)}
        </span>

        <span>
          ${formatTime(state.duration)}
        </span>
      </div>
    </div>

    <div class="full-controls">
      <button
        class="control-btn ${
          state.isShuffled
            ? 'active'
            : ''
        }"
        data-action="toggle-shuffle"
      >
        🔀
      </button>

      <button
        class="control-btn"
        data-action="prev-track"
      >
        ⏮
      </button>

      <button
        class="control-btn primary"
        data-action="toggle-play"
      >
        ${
          state.isPlaying
            ? '❚❚'
            : '▶'
        }
      </button>

      <button
        class="control-btn"
        data-action="next-track"
      >
        ⏭
      </button>

      <button
        class="control-btn ${
          state.repeatMode !== 'off'
            ? 'active'
            : ''
        }"
        data-action="cycle-repeat"
      >
        ${
          state.repeatMode === 'one'
            ? '🔂'
            : '🔁'
        }
      </button>
    </div>
  `
}

function updatePlayerProgress() {
  renderPlayer()
}

// ======================================================
// 9. EVENT DELEGATION
// ======================================================

document.addEventListener(
  'click',
  async e => {
    const btn = e.target.closest(
      '[data-action]'
    )

    if (!btn) return

    const action =
      btn.dataset.action

    if (action === 'open-album') {
      const albumId =
        btn.dataset.albumId

      let album = state.albums.find(
        a => a.id === albumId
      )

      if (!album.tracks) {
        const meta =
          await fetchAlbumMeta(albumId)

        meta.tracks = meta.tracks.map(
          track => ({
            ...track,
            id:
              albumId +
              '-' +
              track.trackNumber,
          })
        )

        Object.assign(album, meta)
      }

      state.currentAlbum = album
      state.view = 'album'

      render()
    }

    if (action === 'go-home') {
      state.view = 'home'
      render()
    }

    if (action === 'play-track') {
      const trackId =
        btn.dataset.trackId

      const album =
        state.currentAlbum

      const index =
        album.tracks.findIndex(
          t => t.id === trackId
        )

      playAlbum(album, index)
    }

    if (action === 'toggle-play') {
      e.stopPropagation()
      togglePlayPause()
    }

    if (action === 'next-track') {
      nextTrack()
    }

    if (action === 'prev-track') {
      prevTrack()
    }

    if (action === 'toggle-shuffle') {
      toggleShuffle()
    }

    if (action === 'cycle-repeat') {
      cycleRepeatMode()
    }

    if (action === 'toggle-like') {
      e.stopPropagation()

      const id =
        btn.dataset.trackId

      if (
        state.likedTrackIds.has(id)
      ) {
        state.likedTrackIds.delete(id)
      } else {
        state.likedTrackIds.add(id)
      }

      saveLiked()

      render()
      renderPlayer()
    }

    if (
      action === 'open-full-player'
    ) {
      state.fullPlayerOpen = true
      renderFullscreenPlayer()
    }

    if (
      action === 'close-full-player'
    ) {
      state.fullPlayerOpen = false
      renderFullscreenPlayer()
    }

    if (action === 'open-liked') {
      state.view = 'liked'
      render()
    }
  }
)

document.addEventListener(
  'input',
  e => {
    if (
      e.target.id === 'searchInput'
    ) {
      state.searchQuery =
        e.target.value

      render()
    }

    if (
      e.target.dataset.action ===
      'seek'
    ) {
      seekTo(Number(e.target.value))
    }
  }
)

let touchStartY = 0

fullscreenPlayer.addEventListener(
  'touchstart',
  e => {
    touchStartY =
      e.changedTouches[0].clientY
  }
)

fullscreenPlayer.addEventListener(
  'touchend',
  e => {
    const endY =
      e.changedTouches[0].clientY

    if (endY - touchStartY > 120) {
      state.fullPlayerOpen = false
      renderFullscreenPlayer()
    }
  }
)

// ======================================================
// 10. INIT
// ======================================================

function formatTime(sec) {
  if (!sec || Number.isNaN(sec))
    return '0:00'

  const mins = Math.floor(sec / 60)
  const secs = Math.floor(sec % 60)

  return `${mins}:${String(secs).padStart(
    2,
    '0'
  )}`
}

function addRecentlyPlayed(track) {
  state.recentlyPlayed =
    state.recentlyPlayed.filter(
      t => t.id !== track.id
    )

  state.recentlyPlayed.unshift(track)

  state.recentlyPlayed =
    state.recentlyPlayed.slice(0, 20)

  saveRecent()

  render()
}

async function init() {
  loadLiked()
  loadRecent()

  runParserTests()

  await fetchAlbums()

  render()
}

init()