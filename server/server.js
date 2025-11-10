const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const state = require("./state");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://collaborative-canvas-3l5p.onrender.com", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "..", "client")));

io.on("connection", socket => {
  const roomId = "main";

  const user = {
    socketId: socket.id,
    userId: uuidv4(),
    color: pickColor(),
    name: "User-" + Math.random().toString(36).substring(2, 6)
  };

  socket.join(roomId);
  state.addClient(roomId, socket.id, user);

  socket.emit("welcome", { user, roomId });
  socket.emit("full-state", state.getFullState(roomId));

  io.to(roomId).emit(
    "users",
    Array.from(state.createRoomIfMissing(roomId).clients.values())
  );

  socket.on("cursor", data => {
    socket.to(roomId).emit("cursor", {
      userId: user.userId,
      color: user.color,
      x: data.x,
      y: data.y
    });
  });

  socket.on("stroke:start", stroke => {
    if (!stroke.id) stroke.id = uuidv4();
    state.pushStroke(roomId, stroke);
    socket.to(roomId).emit("stroke:start", stroke);
  });

  socket.on("stroke:data", payload => {
    state.appendPoints(roomId, payload.id, payload.points);
    socket.to(roomId).emit("stroke:data", payload);
  });

  socket.on("stroke:end", payload => {
    // mark on server state so full-state includes finalized strokes
    state.finalizeStroke(roomId, payload.id);
    socket.to(roomId).emit("stroke:end", payload);
  });

  socket.on("undo", () => {
    const op = state.undoLastOp(roomId);
    if (op) {
      io.to(roomId).emit("op-removed", { id: op.id });
      // also broadcast full-state as a robust sync fallback
      io.to(roomId).emit("full-state", state.getFullState(roomId));
    }
  });

  socket.on("redo", () => {
    const op = state.redoLastOp(roomId);
    if (op) {
      io.to(roomId).emit("op-restored", { id: op.id, stroke: op.stroke });
      // also broadcast full-state as a robust sync fallback
      io.to(roomId).emit("full-state", state.getFullState(roomId));
    }
  });

  socket.on("disconnect", () => {
    state.removeClient(roomId, socket.id);
    io.to(roomId).emit(
      "users",
      Array.from(state.createRoomIfMissing(roomId).clients.values())
    );
  });
});

server.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});

function pickColor() {
  const palette = [
    "#e6194b",
    "#3cb44b",
    "#ffe119",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#42d4f4",
    "#f032e6",
    "#bfef45"
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}
