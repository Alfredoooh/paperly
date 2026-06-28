import { writable, derived } from 'svelte/store';

export const PROXY = 'https://nexavps00001-test.onrender.com';

// Feed
export const feedTracks   = writable([]);
export const newAlbums    = writable([]);
export const trendTracks  = writable([]);
export const playlists    = writable([]);
export const artists      = writable([]);
export const feedLoading  = writable(true);
export const feedError    = writable(false);

// Player
export const currentTrack = writable(null);
export const playing      = writable(false);
export const progress     = writable(0);
export const duration     = writable(30);
export const playerOpen   = writable(false);
export const shuffle      = writable(false);
export const repeatMode   = writable(0);
export const queue        = writable([]);
export const liked        = writable(new Set());
export const lyrics       = writable(null);
export const lyricsLoading = writable(false);

// Audio instance (não reativo, só referência)
export let audioInstance = null;
let progressTimer = null;

export function setAudio(a) { audioInstance = a; }

export async function loadFeed() {
  feedLoading.set(true);
  feedError.set(false);
  try {
    const res  = await fetch(`${PROXY}/api/feed`);
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    feedTracks.set(data.tracks    || []);
    newAlbums.set(data.albums     || []);
    trendTracks.set((data.tracks  || []).slice(50));
    playlists.set(data.playlists  || []);
    artists.set(data.artists      || []);
  } catch {
    feedError.set(true);
  } finally {
    feedLoading.set(false);
  }
}

export async function playTrack(track) {
  if (!track) return;

  // Para o áudio anterior
  if (audioInstance) {
    audioInstance.pause();
    clearInterval(progressTimer);
  }

  currentTrack.set(track);
  progress.set(0);
  duration.set(30);
  playing.set(false);
  lyrics.set(null);

  // Tenta preview Deezer primeiro (30s)
  let audioUrl = track.preview || null;

  // Se não tem preview, vai buscar ao YouTube via servidor
  if (!audioUrl) {
    try {
      const res = await fetch(
        `${PROXY}/api/audio/url?track=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist?.name || '')}`
      );
      if (res.ok) {
        const data = await res.json();
        audioUrl = data.url || null;
      }
    } catch { /* sem áudio */ }
  }

  if (!audioUrl) return;

  const audio = new Audio(audioUrl);
  audio.crossOrigin = 'anonymous';
  setAudio(audio);

  audio.play().catch(() => {});
  playing.set(true);

  audio.onloadedmetadata = () => duration.set(audio.duration || 30);
  audio.onended = () => {
    playing.set(false);
    progress.set(0);
    // auto-next
    let r; repeatMode.subscribe(v => r = v)();
    if (r === 2) { audio.currentTime = 0; audio.play(); playing.set(true); }
    else playNext();
  };

  progressTimer = setInterval(() => {
    if (audioInstance) progress.set(audioInstance.currentTime);
  }, 500);

  // Carrega letras em background
  fetchLyrics(track);
}

async function fetchLyrics(track) {
  if (!track?.title || !track?.artist?.name) return;
  lyricsLoading.set(true);
  try {
    const res = await fetch(
      `${PROXY}/api/lyrics?track=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist.name)}`
    );
    if (res.ok) {
      const data = await res.json();
      lyrics.set(data.lyrics || null);
    }
  } catch { lyrics.set(null); }
  finally { lyricsLoading.set(false); }
}

export function togglePlay() {
  if (!audioInstance) return;
  playing.update(p => {
    if (p) audioInstance.pause();
    else   audioInstance.play().catch(() => {});
    return !p;
  });
}

export function seekTo(pct) {
  if (!audioInstance) return;
  let d; duration.subscribe(v => d = v)();
  audioInstance.currentTime = pct * d;
  progress.set(audioInstance.currentTime);
}

export function stopAll() {
  audioInstance?.pause();
  clearInterval(progressTimer);
  currentTrack.set(null);
  playing.set(false);
  progress.set(0);
  playerOpen.set(false);
  lyrics.set(null);
}

export function toggleLike(id) {
  liked.update(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
}

export function playNext() {
  let q, ct, sh;
  queue.subscribe(v => q = v)();
  currentTrack.subscribe(v => ct = v)();
  shuffle.subscribe(v => sh = v)();
  if (!q?.length) return;
  if (sh) { playTrack(q[Math.floor(Math.random() * q.length)]); return; }
  const i = q.findIndex(t => t.id === ct?.id);
  playTrack(q[(i + 1) % q.length]);
}

export function playPrev() {
  let q, ct;
  queue.subscribe(v => q = v)();
  currentTrack.subscribe(v => ct = v)();
  if (!q?.length) return;
  const i = q.findIndex(t => t.id === ct?.id);
  playTrack(q[(i - 1 + q.length) % q.length]);
}