const usernameInput = document.getElementById("username-input");
const roomNameInput = document.getElementById("room-name-input");
const createBtn = document.getElementById("create-btn");
const roomList = document.getElementById("room-list");

// Persist username
usernameInput.value = localStorage.getItem("vc_username") || "";
usernameInput.addEventListener("input", () => {
  localStorage.setItem("vc_username", usernameInput.value.trim());
});

function getUsername() {
  return usernameInput.value.trim() || "Anonymous";
}

async function fetchRooms() {
  const res = await fetch("/api/rooms");
  return await res.json();
}

function renderRooms(rooms) {
  if (!rooms.length) {
    roomList.innerHTML = '<p class="empty-state">No active rooms. Create one above!</p>';
    return;
  }
  roomList.innerHTML = rooms
    .map(
      (r) => `
    <div class="room-card">
      <div class="room-info">
        <h3>${escHtml(r.name)}</h3>
        <p>${r.participants} participant${r.participants !== 1 ? "s" : ""}</p>
      </div>
      <button class="btn-primary" onclick="joinRoom('${r.id}')">Join</button>
    </div>`
    )
    .join("");
}

window.joinRoom = function (roomId) {
  const username = getUsername();
  window.location.href = `/room.html?roomId=${roomId}&username=${encodeURIComponent(username)}`;
};

createBtn.addEventListener("click", async () => {
  const username = getUsername();
  const name = roomNameInput.value.trim() || `${username}'s Room`;

  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const room = await res.json();
  window.location.href = `/room.html?roomId=${room.id}&username=${encodeURIComponent(username)}`;
});

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Refresh room list every 4 seconds
async function refresh() {
  try {
    const rooms = await fetchRooms();
    renderRooms(rooms);
  } catch {
    roomList.innerHTML = '<p class="empty-state">Could not reach server.</p>';
  }
}

refresh();
setInterval(refresh, 4000);
