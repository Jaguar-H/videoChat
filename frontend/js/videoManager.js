const grid = document.getElementById("video-grid");

export function addLocalTile(stream, username) {
  return addTile("local", stream, `${username} (you)`, true);
}

export function addRemoteTile(userId, stream, username) {
  removeTile(userId);
  return addTile(userId, stream, username, false);
}

export function removeTile(userId) {
  const el = document.getElementById(`tile-${userId}`);
  if (el) el.remove();
}

export function setVideoEnabled(userId, enabled) {
  const overlay = document.querySelector(`#tile-${userId} .no-video-overlay`);
  const video = document.querySelector(`#tile-${userId} video`);
  if (overlay) overlay.style.display = enabled ? "none" : "flex";
  if (video) video.style.display = enabled ? "block" : "none";
}

function addTile(id, stream, label, muted) {
  const tile = document.createElement("div");
  tile.className = "video-tile";
  tile.id = `tile-${id}`;

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = muted;
  video.srcObject = stream;

  const labelEl = document.createElement("div");
  labelEl.className = "label";
  labelEl.textContent = label;

  const overlay = document.createElement("div");
  overlay.className = "no-video-overlay";
  overlay.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.888L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  overlay.style.display = "none";

  tile.append(video, overlay, labelEl);
  grid.appendChild(tile);
  return tile;
}
