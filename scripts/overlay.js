/**
 * @file scripts/overlay.js
 * @description Loads a lightweight overlay (Handlebars template) into the
 * observer window. Safe to skip if the template is missing.
 */

/**
 * Render an overlay into <body>, wrapped in #aof-observer-overlay.
 * If the template can't be found, we log a warning but continue.
 * @returns {Promise<void>}
 */
export async function loadOverlay() {
    const WRAPPER_ID = "aof-observer-overlay";
    if (document.getElementById(WRAPPER_ID)) return; // Already loaded

    try {
        // Adjust the path if your template lives elsewhere
        const html = await renderTemplate("modules/stream-director/templates/observer.hbs", {});
        const wrapper = document.createElement("div");
        wrapper.id = WRAPPER_ID;
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);
        console.log("Observer | Overlay loaded");
    } catch (err) {
        console.warn("Observer | Overlay failed to load:", err);
    }
}
