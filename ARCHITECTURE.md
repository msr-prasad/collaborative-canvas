# Collaborative Canvas — Architecture

## 1. High-level overview
- Single room ("main") by default; clients join that room on connect.
- Server (Node.js + socket.io) holds canonical state (ops history, clients).
- Clients send stroke events; server persists ops and broadcasts to other clients.
- Clients render local strokes immediately (optimistic) and apply remote ops as received.

## 2. Data flow (textual)
1. Client pointerdown -> create stroke with id -> emit `stroke:start` (stroke meta + first point).
2. Client pointermove -> buffer points -> periodically emit `stroke:data` (batched points).
3. Client pointerup -> emit `stroke:end` -> server marks op finalized.
4. Server stores ops (push/append/finalize) and broadcasts `stroke:start`, `stroke:data`, `stroke:end` to other clients.
5. Undo/Redo: client emits `undo`/`redo` -> server marks op.active false/true and emits `op-removed`/`op-restored` (also `full-state` as fallback).

## 3. WebSocket protocol (messages & payloads)
- Client -> Server
  - `stroke:start` { id, userId, color, width, mode, points:[{x,y}] }
  - `stroke:data` { id, points: [{x,y}, ...] }
  - `stroke:end` { id }
  - `cursor` { x: normalized, y: normalized }
  - `undo` / `redo`
- Server -> Client
  - `welcome` { user, roomId }
  - `full-state` { ops: [{ id, stroke, active }], users: [...] }
  - `users` [user,...]
  - `stroke:start` stroke
  - `stroke:data` { id, points }
  - `stroke:end` { id }
  - `op-removed` { id }
  - `op-restored` { id, stroke }
  - `cursor` { userId, color, x, y }

Include JSON examples in README if needed.

## 4. State model
- rooms: { [roomId]: { clients: Map<socketId, user>, ops: Op[] } }
- Op: { id: string, stroke: { id, userId, color, width, mode, points[] }, active: boolean, finalized: boolean }

## 5. Undo / Redo strategy (global)
- Server maintains ordered ops array.
- Undo: find last op where active === true, set active=false and broadcast `op-removed`.
- Redo: find last op where active === false (search from end), set active=true and broadcast `op-restored`.
- Clients rebuild visible canvas by iterating ops where active === true (server also emits `full-state` when necessary).
- Rationale: global linear history keeps undo/redo intuitive across users; operations are not per-user stacks.

## 6. Conflict resolution
- Drawing operations are additive; later ops draw over earlier ones.
- Eraser implemented as a stroke with mode="erase" (composite operation destination-out) so eraser ops remove pixels visually — they are still ops in history.
- Deterministic resolution: ops are applied in server order. Network latency can cause different temporary views; `full-state` resync resolves divergence.

## 7. Performance decisions
- Client-side batching: emit `stroke:data` every 50ms (reduces socket load).
- High-DPI support: canvas scaled by devicePixelRatio for crisp rendering.
- Redraw strategy: server ops -> client maintains ops list; redraw clears canvas and replays visible ops. Optimize by:
  - Only redrawing on op changes and window resize.
  - Optionally maintain an offscreen layer for finalized ops (future).
- Points smoothing: quadraticCurveTo between points for smooth strokes.
- Consider decimation (e.g., Ramer–Douglas–Peucker) for long strokes as future optimization.

## 8. Persistence & recovery
- Current implementation is in-memory (server state.js). On server restart state is lost.
- Persistence options: write ops to disk (append-only), or a lightweight DB (sqlite/postgres). On restart load persisted ops and expose via `full-state`.

## 9. Scaling considerations
- Single room current design; to scale:
  - Add rooms/IDs and namespace sockets per room.
  - Shard room state across processes/services; use Redis pub/sub for cross-process socket.io broadcasts.
  - For large canvases and high throughput, offload finalized raster to storage and stream diffs.

## 10. Security and robustness
- Validate incoming payloads on server (point types, max points per message).
- Rate-limit clients or enforce throttling.
- Sanitize user-provided names (if added).
- Use CORS restrictions and origin checks in production.

## 11. Testing & QA
- Manual: open multiple clients and test concurrent draw, undo/redo, reconnection.
- Automated: unit tests for state module (pushStroke, appendPoints, finalizeStroke, undo/redo).
- Integration: simulate socket events to verify full-state sync and op broadcasts.

## 12. File map (where to look in repo)
- client/index.html — script loading order and UI.
- client/socket.js — socket initialization and user handling.
- client/canvas.js — rendering, resize, drawStrokeOnCtx, event handlers for incoming ops.
- client/main.js — pointer events, buffering, emitting stroke events.
- server/server.js — socket.io handlers, room wiring and broadcasts.
- server/state.js — canonical op storage and undo/redo logic.

## 13. Open issues / future work
- Durable persistence.
- Per-user undo (optional alternative UI).
- Improved conflict resolution for heavy concurrency.
- Performance: offscreen canvas caching, incremental layer snapshots.