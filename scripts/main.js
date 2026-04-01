/**
 * @file scripts/main.js
 * @description Stream Director — ES module entry.
 * Wires up settings, macro creation, and observer-mode boot.
 * Foundry v13 compatible. No TypeScript.
 *
 * How it works (simple version):
 * - GM window: broadcasts camera changes.
 * - Observer window (?observer=true): hides UI, loads overlay, and mirrors the GM camera.
 */

import { injectObserverStyles, injectGlobalStyles } from "./styles.js";
import { loadOverlay } from "./overlay.js";
import { initCameraSync, initObserverDebugLogs } from "./camera.js";
import { showSceneBanner } from "./banner.js";
import { registerMacroHook } from "./macro.js";
import { registerModuleSettings } from "./settings.js";
import { registerRollOverlayHook } from "./rolls.js";
import { renderPlayerHud } from "./playerHud.js";
import { AnchorVisionApp, registerAnchorVisionApi, registerAnchorVisionControls } from "./anchor-vision-app.js";
import { StreamDirector, registerStreamDirectorApi } from "./stream-director.js";

/**
 * Foundry lifecycle: init
 * - Register settings
 * - Prepare the hook that creates the macro (on ready)
 */
Hooks.once("init", async () => {
  console.log("Stream Director | Initializing (ESM)");
  const moduleId = "stream-director";

  // Register settings
  registerModuleSettings();

  // Register Handlebars partials
  loadTemplates([
    `modules/${moduleId}/templates/player-card.hbs`,
    `modules/${moduleId}/templates/anchor-app.hbs`
  ]);

  registerAnchorVisionControls();
});

/**
 * Foundry lifecycle: ready
 * - If this window is the Observer (?observer=true),
 *   hide GM UI and load overlay.
 * - Start camera sync in BOTH windows:
 *   - GM window broadcasts
 *   - Observer window listens and mirrors
 */
Hooks.once("ready", async () => {
  // ✅ Always inject global styles (JB2A dark theme, etc.)
  injectGlobalStyles();

  // Make sure the macro is created/updated if needed
  registerMacroHook();

  const isObserver = !!new URLSearchParams(window.location.search).get("observer");

  if (isObserver) {
    console.log("Observer | Running in observer mode (ESM)");

    // ✅ Observer-only CSS & body class
    injectObserverStyles();
    document.body.classList.add("observer-mode");

    // Optional overlay UI
    await loadOverlay();

    // Handy debug logs while testing scene swaps (optional)
    initObserverDebugLogs();

    // Show the scene banner on initial load
    Hooks.on("canvasReady", (canvas) => {
      showSceneBanner(canvas?.scene);
    });

    // Show a quick dice roll overlay when anyone rolls
    registerRollOverlayHook();

    // Render the player HUD
    await renderPlayerHud();

    /**
 * ------------------------------
 * Epic Rolls Observer Mirroring
 * ------------------------------
 *
 * Epic Rolls (epic-rolls-5e) normally spawns its UI only for GMs/players.
 * Observers are ignored, so without this block, no Epic Roll window will
 * ever appear in the observer window.
 *
 * This hook listens to Epic Rolls socket traffic and mirrors the same events
 * locally in the observer:
 *
 * - dispatchEpicRoll → start a new Epic Roll window
 * - updateEpicRoll  → update the active roll with player results
 * - endEpicRoll     → gracefully close the roll window
 * - toggleRollButton → animate roll buttons (disable, shake, etc.)
 *
 * We call Epic Rolls' own EpicRoll class/methods directly so that the
 * observer window renders exactly the same UI as players/GM.
 *
 * @requires epic-rolls-5e module
 */
    if (game.modules.get("epic-rolls-5e")?.active) {
      console.log("Observer | Epic Rolls detected, wiring observer listener…");

      game.socket.on("module.epic-rolls-5e", (packet) => {
        const evt = packet?.__$socketOptions?.__$eventName;
        if (!evt) return;

        try {
          if (evt === "dispatchEpicRoll") {
            console.log("Observer | Epic Roll start:", packet);
            new ui.EpicRolls5e.EpicRoll(packet).init().render(true);
          }
          else if (evt === "updateEpicRoll" && ui.EpicRolls5e._currentRoll) {
            ui.EpicRolls5e._currentRoll.update(packet);
          }
          else if (evt === "endEpicRoll" && ui.EpicRolls5e._currentRoll) {
            ui.EpicRolls5e._currentRoll.endEpicRoll(packet);
          }
          else if (evt === "toggleRollButton" && ui.EpicRolls5e._currentRoll) {
            ui.EpicRolls5e._currentRoll.toggleRollButton(packet.uuid, packet.rolling);
          }
        } catch (err) {
          console.warn("Observer | Epic Roll mirror failed:", evt, err);
        }
      });
    }
    // --- End Epic Rolls compatibility ---

  }

  // Start the camera sync layer for both windows.
  initCameraSync(isObserver);

  registerAnchorVisionApi();
  registerStreamDirectorApi();

  // --- URL Params: Stream Director bootstrap (added additively) ---
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("stream") === "true") {
    // Activar modo stream automáticamente
    StreamDirector.setStreamMode(true);
    // Opcional: abrir el anchor panel si también se pasa ?anchor=true
    if (urlParams.get("anchor") === "true") {
      new AnchorVisionApp().render(true);
    }
    console.log(`[stream-director] ${game.i18n.localize("STREAM_DIRECTOR.streamMode.urlParam")}.`);
  }
});
