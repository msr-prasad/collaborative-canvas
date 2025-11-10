// Avoid declaring a top-level `socket` identifier that can clash if script executes twice
const SERVER_URL = 'https://collaborative-canvas-server.onrender.com';

// Initialize socket with connection options
window.__io = window.__io || io(SERVER_URL, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  transports: ['websocket', 'polling']
});

const _socket = window.__io;

// Initialize local user as null
window.__LOCAL_USER = null;

// Connection status handling
_socket.on('connect', () => {
  console.log('Connected to server');
  document.body.style.opacity = '1';
});

_socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  alert('Failed to connect to server. Please check your connection and refresh the page.');
});

_socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  document.body.style.opacity = '0.5';
});

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
