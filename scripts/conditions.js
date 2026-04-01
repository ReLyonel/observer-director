/**
 * @file scripts/conditions.js
 * @description Handles condition overlays on player cards.
 * - If JB2A is installed: plays persistent looping animations for core 5e conditions.
 * - If JB2A is missing or no path set: falls back to showing condition icons on the card.
 */

let hasJB2A = false;

Hooks.once("ready", () => {
  hasJB2A =
    game.modules.get("jb2a_patreon")?.active ||
    game.modules.get("JB2A_DnD5e")?.active;

  console.log("Observer | JB2A detected (conditions):", hasJB2A);
});

/**
 * Apply condition visuals to a card.
 * @param {HTMLElement} card - The player card element.
 * @param {Actor5e} actor - The actor to pull conditions from.
 */
export function applyConditionEffects(card, actor) {
  if (!actor) return;

  const activeConditions = actor.effects.filter(e => !e.disabled);

  // Remove stale effects before re-render
  card.querySelectorAll("video.condition-effect, .conditions").forEach(el => el.remove());

  for (const effect of activeConditions) {
    // --- Determine key name ---
    let key = null;
    if (effect.statuses && effect.statuses.size) {
      key = Array.from(effect.statuses)[0]; // e.g. "blinded"
    } else {
      key = effect.label?.toLowerCase();
    }
    if (!key) continue;

    // Build setting key, e.g. "jb2aBlinded"
    const settingKey = "jb2a" + key.charAt(0).toUpperCase() + key.slice(1);

    // ✅ Only fetch if registered
    let animFile = null;
    if (game.settings.settings.has(`observer-director.${settingKey}`)) {
      animFile = game.settings.get("observer-director", settingKey);
    }

    // --- JB2A animation path ---
    if (hasJB2A && animFile) {
      const video = document.createElement("video");
      video.src = animFile;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.className = "condition-effect";
      video.dataset.condition = key;
      video.style.position = "absolute";
      video.style.top = "50%";
      video.style.left = "50%";
      video.style.transform = "translate(-50%, -50%)";
      video.style.pointerEvents = "none";
      video.style.width = "200%";
      video.style.zIndex = "9";

      card.appendChild(video);
    }

    // --- Fallback: system/default icon ---
    else {
      let container = card.querySelector(".conditions");
      if (!container) {
        container = document.createElement("div");
        container.className = "conditions";
        card.appendChild(container);
      }

      const img = document.createElement("img");
      img.src = effect.icon || "icons/svg/status.svg";
      img.className = "condition-icon";
      container.appendChild(img);
    }
  }
}
