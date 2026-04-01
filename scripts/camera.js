/**
 * @file scripts/camera.js
 * @description Camera sync via socketlib with robust readiness handling.
 * - GM broadcasts camera; Observer mirrors.
 * - Works whether socketlib is ready before/after our code runs.
 */

const MODULE_ID = "stream-director";
let socket = null;

/** Optional debug logs for scene/canvas lifecycle. */
export function initObserverDebugLogs() {
  Hooks.on("canvasTearDown", () => console.log("Observer | canvasTearDown (scene unloading)"));
  Hooks.on("canvasReady", (cnv) => console.log(`Observer | canvasReady for scene: ${cnv?.scene?.name}`));
}

/**
 * Initialize camera sync. Works in both windows.
 * @param {boolean} isObserver  True if this tab has ?observer=true
 */
export function initCameraSync(isObserver) {
  _ensureSocketlibReady(() => {
    console.log("Observer | socketlib ready");

    socket = socketlib.registerModule(MODULE_ID);

    // Register RPCs exactly once here
    socket.register("applyCamera", _applyCamera);
    socket.register("requestInitialView", _handleSnapshotRequest); // observer calls this on GM

    // GM window: start broadcasting
    if (!isObserver && game.user?.isGM) {
      _startGMBroadcast();
    }

    // Observer window: request an initial snapshot
    if (isObserver) {
      _requestInitialView();
    }
  });
}

/* ------------------------ socketlib bootstrap ------------------------ */

/**
 * Call `done()` as soon as socketlib is usable.
 * Handles: already-ready, ready-later, and odd load orders.
 */
function _ensureSocketlibReady(done) {
  const mod = game.modules.get("socketlib");
  if (!mod || !mod.active) {
    ui.notifications?.error("Stream Director: socketlib is required and not active.");
    console.error("Observer | socketlib missing/disabled");
    return;
  }

  if (window.socketlib?.registerModule) {
    done();
    return;
  }

  let finished = false;
  const finish = () => { if (!finished) { finished = true; done(); } };

  Hooks.once("socketlib.ready", finish);
  Hooks.once("ready", () => {
    if (window.socketlib?.registerModule) finish();
  });

  const startedAt = Date.now();
  const poll = setInterval(() => {
    if (window.socketlib?.registerModule) {
      clearInterval(poll);
      finish();
    } else if (Date.now() - startedAt > 4000) {
      clearInterval(poll);
      ui.notifications?.error("Stream Director: socketlib did not initialize.");
      console.error("Observer | socketlib failed to initialize");
    }
  }, 100);
}

/* ---------------------------- GM SIDE ---------------------------- */

function _startGMBroadcast() {
  console.log("Observer | GM camera broadcast enabled (socketlib)");

  let lastSent = 0;
  const THROTTLE_MS = 50;

  const send = () => {
    const snap = _getViewSnapshot();
    if (!snap) return;

    const now = Date.now();
    if (now - lastSent < THROTTLE_MS) return;
    lastSent = now;

    socket.executeForOthers("applyCamera", snap);
    // DEBUG:
    // console.debug("Observer | GM -> broadcast", snap);
  };

  Hooks.on("canvasPan", send);
  Hooks.on("canvasZoom", send);
  Hooks.on("canvasReady", () => setTimeout(send, 150));
}

/**
 * Build a robust snapshot of the current GM view.
 * @returns {{sceneId:string|null,x:number,y:number,scale:number}|null}
 */
function _getViewSnapshot() {
  if (!canvas || !canvas.ready) return null;
  const sceneId = canvas?.scene?.id ?? null;

  // Preferred (v12/v13): internal view position
  const vp = canvas?.scene?._viewPosition;
  if (vp && typeof vp.x === "number" && typeof vp.y === "number") {
    return { sceneId, x: vp.x, y: vp.y, scale: vp.scale ?? canvas.zoom ?? 1 };
  }

  // Fallback: camera center + zoom
  const center = canvas?.camera?.center;
  const zoom = canvas?.zoom ?? canvas?.stage?.scale?.x ?? 1;
  if (center && typeof center.x === "number" && typeof center.y === "number") {
    return { sceneId, x: center.x, y: center.y, scale: zoom };
  }

  // Last resort: stage transform
  const st = canvas?.stage;
  if (st?.pivot && typeof st.pivot.x === "number") {
    return { sceneId, x: st.pivot.x, y: st.pivot.y, scale: st.scale?.x ?? 1 };
  }
  return null;
}

/* -------------------------- OBSERVER SIDE ------------------------ */

/** Ask the GM (via socketlib) for a one-time snapshot. */
function _requestInitialView() {
  const me = game.user?.id;
  if (!me) return;
  // Execute on a GM client; GM will respond via applyCamera → only this user
  socket.executeAsGM("requestInitialView", me);
}

/**
 * GM-side RPC: respond to an observer’s initial snapshot request.
 * @param {string} requesterId - user id of the requesting observer
 */
function _handleSnapshotRequest(requesterId) {
  if (!game.user?.isGM) return;
  const snap = _getViewSnapshot();
  if (!snap) return;
  socket.executeForUsers("applyCamera", [requesterId], snap);
  // DEBUG:
  // console.debug("Observer | GM -> initial snapshot", requesterId, snap);
}

/**
 * Apply a camera update. Runs on all clients, but only observers act.
 * @param {{sceneId:string|null,x:number,y:number,scale:number}} msg
 */
async function _applyCamera(msg) {
  const isObserver = !!new URLSearchParams(window.location.search).get("observer");
  if (!isObserver) return;

  // ✅ Skip if follow disabled
  const followEnabled = game.settings.get("stream-director", "cameraFollow");
  if (!followEnabled) return;

  const myScene = canvas?.scene?.id ?? null;
  if (msg.sceneId && myScene && msg.sceneId !== myScene) return;

  if (!canvas?.ready) await new Promise((r) => Hooks.once("canvasReady", r));
  const { x, y, scale } = msg || {};
  if (typeof x !== "number" || typeof y !== "number" || typeof scale !== "number") return;

  try {
    canvas.animatePan({ x, y, scale, duration: 200 });
  } catch (err) {
    console.warn("Observer | animatePan failed", err);
  }
}
