import { SignalingClient } from "./signalingClient.js";
import { RTCManager } from "./rtcManager.js";
import { addLocalTile, addRemoteTile, removeTile, setVideoEnabled, setLocalPip } from "./videoManager.js";

const params = new URLSearchParams(location.search);
const roomId = params.get("roomId");
const username = params.get("username") || "Anonymous";
const userId = crypto.randomUUID();

// Peer username map for labels
const peerNames = new Map();

// UI refs
const roomNameDisplay = document.getElementById("room-name-display");
const roomIdBadge = document.getElementById("room-id-badge");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const flipBtn = document.getElementById("flip-btn");
const leaveBtn = document.getElementById("leave-btn");

if (!roomId) {
  location.href = "/";
}

roomIdBadge.textContent = `Room: ${roomId}`;

// Fetch room name
fetch(`/api/rooms/${roomId}`)
  .then((r) => r.json())
  .then((r) => { if (r.name) roomNameDisplay.textContent = r.name; })
  .catch(() => {});

// ── Media ──────────────────────────────────────────────────────────────────
let localStream;
let micOn = true;
let camOn = true;
let facingMode = "user";

async function getMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
  } catch {
    // Camera/mic denied — create silent/black stream so we can still connect
    localStream = new MediaStream();
  }
  addLocalTile(localStream, username);
}

// ── Signaling ──────────────────────────────────────────────────────────────
const sig = new SignalingClient(handleSignal);

let rtc;

function handleSignal(msg) {
  if (msg.type === "error") {
    setStatus("disconnected", msg.message || "Error");
    return;
  }

  if (msg.type === "room-peers") {
    setStatus("connected", `Connected — ${msg.peers.length + 1} participant${msg.peers.length !== 0 ? "s" : ""}`);
    // Initiate connections to everyone already in room
    for (const peer of msg.peers) {
      peerNames.set(peer.userId, peer.username);
      rtc.connectToPeer(roomId, userId, peer.userId);
    }
    return;
  }

  if (msg.type === "user-joined") {
    peerNames.set(msg.userId, msg.username);
    updateStatus();
    return;
  }

  if (msg.type === "offer") {
    rtc.handleOffer(roomId, msg.from, msg.sdp, userId);
    return;
  }

  if (msg.type === "answer") {
    rtc.handleAnswer(msg.from, msg.sdp);
    return;
  }

  if (msg.type === "ice-candidate") {
    rtc.handleIceCandidate(msg.from, msg.candidate);
    return;
  }

  if (msg.type === "user-left") {
    peerNames.delete(msg.userId);
    rtc.removePeer(msg.userId);
    updateStatus();
    return;
  }

  if (msg.type === "chat") {
    const name = peerNames.get(msg.from) || "Peer";
    appendChatMessage(name, msg.text, false);
    return;
  }
}

function onRemoteStream(peerId, stream) {
  const name = peerNames.get(peerId) || "Peer";
  addRemoteTile(peerId, stream, name);
  setLocalPip(true);
}

function onRemoteLeft(peerId) {
  removeTile(peerId);
  const hasRemotes = document.querySelectorAll(".video-tile:not(#tile-local)").length > 0;
  setLocalPip(hasRemotes);
}

function setStatus(state, text) {
  statusDot.className = `status-dot ${state === "connected" ? "" : state}`;
  statusText.textContent = text;
}

function updateStatus() {
  const count = peerNames.size + 1;
  setStatus("connected", `Connected — ${count} participant${count !== 1 ? "s" : ""}`);
}

// ── Controls ───────────────────────────────────────────────────────────────
const MIC_ON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const MIC_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2"/><path d="M19 10v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const CAM_ON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.888L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>`;
const CAM_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.888L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

micBtn.addEventListener("click", () => {
  micOn = !micOn;
  localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  micBtn.innerHTML = micOn ? MIC_ON_SVG : MIC_OFF_SVG;
  micBtn.className = `btn-icon ${micOn ? "active" : "muted"}`;
});

camBtn.addEventListener("click", () => {
  camOn = !camOn;
  localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  camBtn.innerHTML = camOn ? CAM_ON_SVG : CAM_OFF_SVG;
  camBtn.className = `btn-icon ${camOn ? "active" : "muted"}`;
  setVideoEnabled("local", camOn);
});

// ── Camera flip ────────────────────────────────────────────────────────────
navigator.mediaDevices.enumerateDevices().then((devices) => {
  const cams = devices.filter((d) => d.kind === "videoinput");
  if (cams.length > 1) flipBtn.style.display = "";
}).catch(() => {});

flipBtn.addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    const newTrack = newStream.getVideoTracks()[0];
    const oldTrack = localStream.getVideoTracks()[0];
    if (oldTrack) { localStream.removeTrack(oldTrack); oldTrack.stop(); }
    localStream.addTrack(newTrack);
    const localVideo = document.querySelector("#tile-local video");
    if (localVideo) localVideo.srcObject = localStream;
    rtc.replaceVideoTrack(newTrack);
  } catch {
    facingMode = facingMode === "user" ? "environment" : "user"; // revert on failure
  }
});

// ── Chat ───────────────────────────────────────────────────────────────────
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatMessages = document.getElementById("chat-messages");

function appendChatMessage(author, text, self) {
  const msg = document.createElement("div");
  msg.className = `chat-msg${self ? " self" : ""}`;
  msg.innerHTML = `<span class="chat-author">${author}</span><span class="chat-text">${text.replace(/</g, "&lt;")}</span>`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  sig.send({ type: "chat", roomId, text });
  appendChatMessage("You", text, true);
  chatInput.value = "";
}

chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

const chatPanel = document.getElementById("chat-panel");
document.getElementById("chat-toggle").addEventListener("click", () => {
  chatPanel.classList.toggle("collapsed");
});

// ── Auto-hide controls ─────────────────────────────────────────────────────
const callMain = document.getElementById("call-main");
let hideTimer;

function showControls() {
  callMain.classList.remove("controls-hidden");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => callMain.classList.add("controls-hidden"), 3000);
}

callMain.addEventListener("mousemove", showControls);
callMain.addEventListener("touchstart", showControls, { passive: true });
showControls();

leaveBtn.addEventListener("click", leave);

function leave() {
  sig.send({ type: "leave", roomId });
  sig.close();
  rtc.closeAll();
  localStream?.getTracks().forEach((t) => t.stop());
  location.href = "/";
}

window.addEventListener("beforeunload", leave);

// ── Boot ───────────────────────────────────────────────────────────────────
async function init() {
  await getMedia();

  rtc = new RTCManager(localStream, sig, onRemoteStream, onRemoteLeft);

  sig.connect();

  // Join room once WS opens (queued automatically if not open yet)
  setTimeout(() => {
    sig.send({ type: "join", roomId, userId, username });
  }, 100);
}

init();
