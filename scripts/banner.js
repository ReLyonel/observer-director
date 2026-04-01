/**
 * @file scripts/banner.js
 * @description Handles the scene transition banner shown in observer mode.
 */

/**
 * Show a banner with the scene name for a few seconds.
 * Hook this to canvasReady.
 * @param {Scene} scene
 */
export function showSceneBanner(scene) {

    // Prefer navigation name (what players see), fallback to scene name
    const title = scene?.navName || scene?.name || "New Scene";

    const banner = document.getElementById("scene-banner");
    const text = document.getElementById("scene-title");

    if (!banner || !text) return;

    text.textContent = title;

    banner.classList.remove("hidden");
    banner.classList.add("show");

    // Read the configured duration in seconds, convert to ms
    const duration = game.settings.get("observer-director", "bannerDuration");
    const timeout = Math.max(1, duration) * 1000;

    // Apply the configured font
    const font = game.settings.get("observer-director", "bannerFont");
    text.style.fontFamily = font;


    setTimeout(() => {
        banner.classList.remove("show");
        banner.classList.add("hidden");
    }, timeout);
}
