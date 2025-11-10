// Avoid declaring a top-level `socket` identifier that can clash if script executes twice
const SERVER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://collaborative-canvas-server.onrender.com'; // Update this with your actual server URL once deployed

window.__io = window.__io || io(SERVER_URL);
const _socket = window.__io;

let identity = null;

_socket.on("welcome", data => {
  identity = data.user;
  window.__LOCAL_USER = identity;

  // Default color = server assigned color
  const color = document.getElementById("color");
  color.value = identity.color;
});

_socket.on("users", users => {
  const list = document.getElementById("users");
  list.innerHTML = "";

  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name + " (" + u.userId.slice(0, 4) + ")";
    list.appendChild(li);
  });
});

// Expose socket globally (canvas.js & main.js will use this)
window.__io = _socket;
