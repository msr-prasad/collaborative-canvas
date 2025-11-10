// ✅ Do NOT declare socket here
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const cursors = document.getElementById("cursors");

let ops = [];
let remoteStrokes = new Map();

// ✅ FIXED RESIZE FUNCTION
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  canvas.width = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;

  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  redraw();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ✅ DRAW STROKES
function drawStrokeOnCtx(ctx, stroke) {
  if (!stroke || !stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width;

  if (stroke.mode === "erase") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }

  const pts = stroke.points;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    const midX = (pts[i - 1].x + pts[i].x) / 2;
    const midY = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
  }

  ctx.stroke();
  ctx.restore();
}

// Make drawStrokeOnCtx globally available
window.drawStrokeOnCtx = function(ctx, stroke) {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;

    if (stroke.mode === "erase") {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
    }

    const pts = stroke.points;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
        const midX = (pts[i - 1].x + pts[i].x) / 2;
        const midY = (pts[i - 1].y + pts[i].y) / 2;
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
    }

    ctx.stroke();
    ctx.restore();
};

// ✅ REDRAW EVERYTHING
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let op of ops) {
    if (op.active) drawStrokeOnCtx(ctx, op.stroke);
  }
}

// ✅ LOAD FULL STATE
window.__io.on("full-state", data => {
  ops = data.ops.map(o => ({ id: o.id, stroke: o.stroke, active: o.active }));
  redraw();
});

// ✅ HANDLE REMOTE STROKES
window.__io.on("stroke:start", stroke => {
  remoteStrokes.set(stroke.id, stroke);
});

window.__io.on("stroke:data", payload => {
  const s = remoteStrokes.get(payload.id);
  if (!s) return;

  s.points = s.points.concat(payload.points);
  drawStrokeOnCtx(ctx, s);
});

window.__io.on("stroke:end", payload => {
  const s = remoteStrokes.get(payload.id);
  if (s) {
    ops.push({ id: s.id, stroke: s, active: true });
    remoteStrokes.delete(payload.id);
    redraw();
  }
});

// ✅ UNDO/REDO
window.__io.on("op-removed", ({ id }) => {
  const op = ops.find(o => o.id === id);
  if (op) op.active = false;
  redraw();
});

window.__io.on("op-restored", ({ id, stroke }) => {
  const op = ops.find(o => o.id === id);
  if (op) op.active = true;
  else ops.push({ id, stroke, active: true });
  redraw();
});

// ✅ CURSORS
window.__io.on("cursor", data => {
  let el = document.getElementById("cursor-" + data.userId);

  if (!el) {
    el = document.createElement("div");
    el.id = "cursor-" + data.userId;
    el.className = "cursor";
    cursors.appendChild(el);
  }

  el.textContent = data.userId.slice(0, 4);
  el.style.left = data.x * 100 + "%";
  el.style.top = data.y * 100 + "%";
});
