// Instead of declaring socket again, just use the existing one
const existingSocket = window.__io;

const tool = document.getElementById("tool");
const color = document.getElementById("color");
const width = document.getElementById("width");

const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");

let drawing = false;
let stroke = null;
let buffer = [];
let timer = null;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// ✅ START
canvas.addEventListener("pointerdown", e => {
  canvas.setPointerCapture(e.pointerId);
  drawing = true;

  const p = getPos(e);

  stroke = {
    id: crypto.randomUUID(),
    userId: window.__LOCAL_USER.userId,
    color: color.value,
    width: parseInt(width.value),
    mode: tool.value,
    points: [p]
  };

  existingSocket.emit("stroke:start", stroke);
  buffer.push(p);

  timer = setInterval(() => {
    if (buffer.length > 0) {
      existingSocket.emit("stroke:data", { id: stroke.id, points: buffer });
      buffer = [];
    }
  }, 50);
});

// ✅ MOVE
canvas.addEventListener("pointermove", e => {
  const rect = canvas.getBoundingClientRect();
  existingSocket.emit("cursor", {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height
  });

  if (!drawing) return;

  const p = getPos(e);
  stroke.points.push(p);
  buffer.push(p);

  drawStrokeOnCtx(ctx, stroke);
});

// ✅ END
function finish() {
  if (!drawing) return;

  drawing = false;

  clearInterval(timer);

  if (buffer.length > 0)
    existingSocket.emit("stroke:data", { id: stroke.id, points: buffer });

  existingSocket.emit("stroke:end", { id: stroke.id });

  buffer = [];
  stroke = null;
}

canvas.addEventListener("pointerup", finish);
canvas.addEventListener("pointercancel", finish);
canvas.addEventListener("pointerleave", finish);

// ✅ Undo / Redo
undoBtn.addEventListener("click", () => existingSocket.emit("undo"));
redoBtn.addEventListener("click", () => existingSocket.emit("redo"));
