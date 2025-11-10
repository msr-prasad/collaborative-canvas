const { v4: uuidv4 } = require("uuid");

const rooms = {}; // roomId -> { clients, ops }

function createRoomIfMissing(roomId = "main") {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      clients: new Map(),
      ops: [] // { id, stroke, active, finalized? }
    };
  }
  return rooms[roomId];
}

function addClient(roomId, socketId, user) {
  const r = createRoomIfMissing(roomId);
  r.clients.set(socketId, user);
}

function removeClient(roomId, socketId) {
  const r = rooms[roomId];
  if (!r) return;
  r.clients.delete(socketId);
}

function pushStroke(roomId, stroke) {
  const r = createRoomIfMissing(roomId);
  const op = { id: stroke.id, stroke, active: true, finalized: false };
  r.ops.push(op);
  return op;
}

function appendPoints(roomId, strokeId, points) {
  const r = createRoomIfMissing(roomId);
  const op = r.ops.find(o => o.id === strokeId);
  if (!op) return false;
  op.stroke.points = op.stroke.points.concat(points);
  return true;
}

// Mark stroke as finalized (called on stroke:end)
function finalizeStroke(roomId, strokeId) {
  const r = createRoomIfMissing(roomId);
  const op = r.ops.find(o => o.id === strokeId);
  if (!op) return false;
  op.finalized = true;
  return true;
}

function getFullState(roomId = "main") {
  const r = createRoomIfMissing(roomId);
  return {
    ops: r.ops.map(o => ({ id: o.id, stroke: o.stroke, active: o.active })),
    users: Array.from(r.clients.values())
  };
}

function undoLastOp(roomId = "main") {
  const r = createRoomIfMissing(roomId);
  for (let i = r.ops.length - 1; i >= 0; i--) {
    if (r.ops[i].active) {
      r.ops[i].active = false;
      return r.ops[i];
    }
  }
  return null;
}

function redoLastOp(roomId = "main") {
  const r = createRoomIfMissing(roomId);
  // redo should restore the most-recently undone (search from end -> start)
  for (let i = r.ops.length - 1; i >= 0; i--) {
    if (!r.ops[i].active) {
      r.ops[i].active = true;
      return r.ops[i];
    }
  }
  return null;
}

module.exports = {
  createRoomIfMissing,
  addClient,
  removeClient,
  pushStroke,
  appendPoints,
  finalizeStroke,
  getFullState,
  undoLastOp,
  redoLastOp
};
