/**
 * @file scripts/playerHud.js
 * @description Builds and updates the player HUD in observer mode.
 *
 * - Initial load renders #player-hud with all active players (may be empty).
 * - Hooks.on("updateUser"): add/update/remove cards as players join/leave/swap.
 * - Hooks.on("updateActor"): update HP + damage/heal flash (if hook fires).
 * - Hooks.on("createChatMessage"): show speech bubble over the right card.
 * - Poller every 5s: compares HUD vs game.users, fixes drift, detects HP change.
 */

import { applyConditionEffects } from "./conditions.js";

let hasJB2A = false;

/**
 * v12/v13 compatibility: choose the right renderTemplate function.
 * - v12: global renderTemplate(...)
 * - v13: foundry.applications.handlebars.renderTemplate(...)
 */
const renderFn = foundry?.applications?.handlebars?.renderTemplate ?? renderTemplate;

Hooks.once("ready", () => {
  hasJB2A =
    game.modules.get("jb2a_patreon")?.active ||
    game.modules.get("JB2A_DnD5e")?.active;

  console.log("Observer | JB2A detected (conditions):", hasJB2A);
});

/**
 * Normalize a Foundry user color.
 * Works whether it's a hex string or a Color object.
 * @param {string|object} color
 * @returns {string} Hex string like "#rrggbb"
 */
function normalizeUserColor(color) {
  if (!color) return "#ffffff"; // fallback white
  if (typeof color === "string") return color;
  if (typeof color.toString === "function") return color.toString();
  if (typeof color.toHexString === "function") return color.toHexString();
  return "#ffffff";
}

/* -------------------- INITIAL RENDER -------------------- */

/**
 * Render the HUD wrapper with all current active players.
 */
export async function renderPlayerHud() {
  const isObserver = !!new URLSearchParams(window.location.search).get("observer");
  if (!isObserver) return;

  // Render HUD container with players
  const users = game.users.filter(u => u.active && u.character);
  const players = users.map(user => formatPlayerData(user));

  const hudHtml = await renderFn(
    "modules/observer-director/templates/player-hud.hbs",
    { players }
  );

  const wrapper = document.createElement("div");
  wrapper.innerHTML = hudHtml;

  // Insert GM card into the HUD
  const hud = wrapper.querySelector("#player-hud");
  const gmHtml = await renderGMCard();
  if (gmHtml && hud) {
    const gmWrapper = document.createElement("div");
    gmWrapper.innerHTML = gmHtml;
    hud.prepend(gmWrapper.firstElementChild);
  }

  document.body.appendChild(wrapper);
  console.log("Observer | Player HUD rendered with", players.length, "players + GM");
}

/**
 * Render the GM card (if enabled).
 * @returns {Promise<string>} HTML string or empty string if disabled
 */
async function renderGMCard() {
  const enabled = game.settings.get("observer-director", "gmCardEnabled");
  if (!enabled) return "";

  const portrait = game.settings.get("observer-director", "gmCardImage");
  const title = game.settings.get("observer-director", "gmCardTitle");
  const scene = game.scenes.current?.navName || game.scenes.current?.name || "";
  const gmUser = game.users.find(u => u.isGM);

  const borderColor = normalizeUserColor(gmUser?.color);
  const shadowColor = hexToRgba(borderColor, 0.7);

  return await renderFn(
    "modules/observer-director/templates/gm-card.hbs",
    { portrait, title, scene, borderColor, shadowColor, gmUserId: gmUser?.id }
  );
}

/* -------------------- HELPERS -------------------- */

/**
 * Shape the minimal data the card template needs.
 */
function formatPlayerData(user) {
  const actor = user.character;
  if (!actor) return {};

  const classItems = actor?.items?.filter(i => i.type === "class") ?? [];
  const classes = classItems.map(c => ({
    name: c.name,
    subclass: c.system?.subclass ?? "",
    levels: c.system?.levels ?? 0
  }));
  const totalLevel = classes.reduce((sum, c) => sum + c.levels, 0);

  const borderColor = normalizeUserColor(user.color);
  const shadowColor = hexToRgba(borderColor, 0.7);

  return {
    userId: user.id,
    name: actor?.name ?? "Unknown",
    portrait: actor?.img ?? "icons/svg/mystery-man.svg",
    hp: actor?.system?.attributes?.hp?.value ?? "??",
    ac: actor?.system?.attributes?.ac?.value ?? "??",
    race: actor?.system?.details?.race ?? "",
    classes,
    level: totalLevel,
    borderColor,
    shadowColor
  };
}

/**
 * Render a single player card for a given user.
 */
async function buildPlayerCard(user) {
  const data = formatPlayerData(user);
  return await renderFn(
    "modules/observer-director/templates/player-card.hbs",
    data
  );
}

/* -------------------- HOOKS -------------------- */

/**
 * Actor updates (HP changes + conditions)
 */
Hooks.on("updateActor", (actor, data) => {
  const isObserver = !!new URLSearchParams(window.location.search).get("observer");
  if (!isObserver) return;

  const user = game.users.find(u => u.character?.id === actor.id);
  if (!user) return;

  const card = document.querySelector(`.player-card[data-user-id="${user.id}"]`);
  if (!card) return;

  const newHP = foundry.utils.getProperty(data, "system.attributes.hp.value") ??
    foundry.utils.getProperty(actor, "system.attributes.hp.value");
  if (newHP === undefined) return;

  const hpSpan = card.querySelector(".stat.hp .value");
  let oldHP = 0;
  if (hpSpan) {
    oldHP = parseInt(hpSpan.textContent) || 0;
    hpSpan.textContent = newHP;
  }

  // --- Damage / Heal effects ---
  if (newHP < oldHP) {
    if (hasJB2A) {
      playJB2AEffect(card, "damage");
    } else {
      card.classList.add("flash-damage");
      setTimeout(() => card.classList.remove("flash-damage"), 400);
    }
  } else if (newHP > oldHP) {
    if (hasJB2A) {
      playJB2AEffect(card, "heal");
    } else {
      card.classList.add("flash-heal");
      setTimeout(() => card.classList.remove("flash-heal"), 400);
    }
  }

  // --- Death save overlay tracking ---
  const deathData = actor.system?.attributes?.death;
  if (newHP === 0 && deathData) {
    updateDeathSaveOverlay(user.id, deathData.success, deathData.failure);
  } else {
    clearDeathSaveOverlay(user.id);
  }

  // --- Condition overlays ---
  applyConditionEffects(card, actor);
});

/**
 * User updates (login/logout, character swap)
 */
Hooks.on("updateUser", async (user) => {
  const isObserver = !!new URLSearchParams(window.location.search).get("observer");
  if (!isObserver) return;

  const hud = document.querySelector("#player-hud");
  if (!hud) return;

  const existing = hud.querySelector(`.player-card[data-user-id="${user.id}"]`);

  // skip if gm-card
  if (existing && existing.classList.contains("gm-card")) return;

  if (!user.active || !user.character) {
    if (existing) {
      existing.remove();
      console.log("Observer | Removed card for:", user.name);
    }
    return;
  }

  const html = await buildPlayerCard(user);
  if (existing) {
    existing.outerHTML = html;
    console.log("Observer | Updated card for:", user.name);
  } else {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    hud.appendChild(wrapper.firstElementChild);
    console.log("Observer | Added card for:", user.name);
  }
});

/**
 * Cross-version GM card scene name update (v12/v13)
 * - v13: canvas.scene is fine, prefer .navName then .name
 * - v12: canvas.scene may be null; fallback to game.scenes.current
 */
Hooks.on("canvasReady", (canvas) => {
  const gmCard = document.querySelector(".gm-card .scene-name");
  if (!gmCard) return;

  const scene = canvas?.scene ?? game.scenes.current;
  if (!scene) return;

  gmCard.textContent = scene.navName || scene.name || "";
});

/**
 * Chat message bubbles (non-roll messages)
 * - Finds card by user id, then actor id, then GM card.
 * - Skips Narrator Tools (already has its own overlay).
 * - Sanitizes HTML into plain text to avoid stray tags.
 */
Hooks.on("createChatMessage", (msg) => {
  const isObserver = !!new URLSearchParams(window.location.search).get("observer");
  if (!isObserver) return;

  if (msg.isRoll) return;

  // 🚫 Skip Narrator Tools messages (all known flag variants)
  if (msg.flags?.["narrator-tools"] || msg.flags?.core?.["narratorTools"]) {
    console.log("Observer | Skipped Narrator Tools message:", msg);
    return;
  }

  // --- Identify user
  const uid = msg.author?.id ?? msg.user?._id ?? null;
  const user = uid ? game.users.get(uid) : null;

  if (!user) {
    console.warn("Observer | Could not resolve User for message", msg);
    return;
  }

  // --- Extract safe text
  let text = "";
  if (typeof msg.content === "string") {
    const div = document.createElement("div");
    div.innerHTML = msg.content;
    text = div.textContent || div.innerText || "";
  } else if (msg.content?.textContent) {
    text = msg.content.textContent;
  } else {
    text = msg.alias || "";
  }
  text = (text ?? "").trim();

  if (!text) return;

  // --- Find card
  let card = document.querySelector(`.player-card[data-user-id="${user.id}"]`);
  if (!card && user.isGM) {
    card = document.querySelector(`.player-card.gm-card[data-user-id="${user.id}"]`)
      || document.querySelector(".player-card.gm-card");
  }

  if (!card) {
    console.warn("Observer | No card found for user", user.name, "id:", user.id);
    return;
  }

  // --- Create bubble
  const bubble = document.createElement("div");
  bubble.className = "speech-bubble";
  bubble.textContent = text;

  const container = document.querySelector(
    `.bubble-container[data-user-id="${user.id}"]`
  );
  if (container) {
    container.appendChild(bubble);
    console.log("Observer | Bubble appended to", container);
  } else {
    console.warn("Observer | No bubble container for", user.name, user.id);
  }

  // --- Remove after duration
  const duration = game.settings.get("observer-director", "chatBubbleDuration") || 10;
  setTimeout(() => {
    bubble.classList.add("fade-out");
    setTimeout(() => bubble.remove(), 500);
  }, duration * 1000);
});

/* -------------------- POLLER -------------------- */

/**
 * Every 5s, reconcile DOM cards with active users and reapply overlays.
 * Also detects HP changes to trigger damage/heal flashes for drift.
 */
Hooks.once("ready", () => {
  const isObserver = !!new URLSearchParams(window.location.search).get("observer");
  if (!isObserver) return;

  setInterval(async () => {
    const hud = document.querySelector("#player-hud");
    if (!hud) return;

    const activeUsers = game.users.filter(u => u.active && u.character);
    const domCards = Array.from(hud.querySelectorAll(".player-card"));

    for (const user of activeUsers) {
      const existing = hud.querySelector(`.player-card[data-user-id="${user.id}"]`);
      const html = await buildPlayerCard(user);

      if (existing) {
        const oldHpEl = existing.querySelector(".stat.hp .value");
        let oldHP = 0;
        if (oldHpEl) oldHP = parseInt(oldHpEl.textContent) || 0;

        if (existing.outerHTML !== html) {
          // Replace DOM
          existing.outerHTML = html;
          console.log("Observer | Synced card for:", user.name);

          // Reacquire the new node
          const newCard = document.querySelector(`.player-card[data-user-id="${user.id}"]`);
          const newHpEl = newCard?.querySelector(".stat.hp .value");
          let newHP = 0;
          if (newHpEl) newHP = parseInt(newHpEl.textContent) || 0;

          // --- Damage / Heal check ---
          if (newHP < oldHP) {
            if (hasJB2A) {
              playJB2AEffect(newCard, "damage");
            } else {
              newCard.classList.add("flash-damage");
              setTimeout(() => newCard.classList.remove("flash-damage"), 400);
            }
          } else if (newHP > oldHP) {
            if (hasJB2A) {
              playJB2AEffect(newCard, "heal");
            } else {
              newCard.classList.add("flash-heal");
              setTimeout(() => newCard.classList.remove("flash-heal"), 400);
            }
          }

          // --- Death save overlay tracking ---
          const deathData = user.character?.system?.attributes?.death;
          if (newHP === 0 && deathData) {
            updateDeathSaveOverlay(user.id, deathData.success, deathData.failure);
          } else {
            clearDeathSaveOverlay(user.id);
          }

          // --- Condition overlays ---
          applyConditionEffects(newCard, user.character);
        }
      } else {
        // Missing card -> add it
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        hud.appendChild(wrapper.firstElementChild);
        console.log("Observer | Added missing card for:", user.name);
      }
    }

    // Remove stale cards (users no longer active)
    for (const card of domCards) {
      if (card.classList.contains("gm-card")) continue;
      if (!activeUsers.some(u => u.id === card.dataset.userId)) {
        console.log("Observer | Removed stale card for:", card.dataset.userId);
        card.remove();
      }
    }
  }, 5000);
});

/* -------------------- UTIL / EFFECTS -------------------- */

/**
 * Play JB2A effect if module is installed.
 */
function playJB2AEffect(card, type) {
  const file = (type === "damage")
    ? game.settings.get("observer-director", "jb2aDamage")
    : game.settings.get("observer-director", "jb2aHeal");

  if (!file) return;

  const video = document.createElement("video");
  video.src = file;
  video.autoplay = true;
  video.loop = false;
  video.muted = true;
  video.style.position = "absolute";
  video.style.top = "50%";
  video.style.left = "50%";
  video.style.transform = "translate(-50%, -50%)";
  video.style.pointerEvents = "none";
  video.style.width = "200%";
  video.style.zIndex = "10";

  card.appendChild(video);
  video.onended = () => video.remove();
}

/**
 * Safe hex → rgba converter
 */
function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== "string" || !hex.startsWith("#")) return `rgba(255,255,255,${alpha})`;
  const clean = hex.slice(1);
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return `rgba(255,255,255,${alpha})`;

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Add or update a death-save overlay on a user's card.
 */
function updateDeathSaveOverlay(userId, successes, failures) {
  const card = document.querySelector(`.player-card[data-user-id="${userId}"]`);
  if (!card) return;

  let overlay = card.querySelector(".death-save-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "death-save-overlay";
    card.appendChild(overlay);
  }

  if (failures >= 3) {
    overlay.innerHTML = "☠ <span class='ds-fail'>Dead</span>";
  } else if (successes >= 3) {
    overlay.innerHTML = "✓ <span class='ds-success'>Stabilized</span>";
  } else {
    overlay.innerHTML = `
      Death Save:
      <span class="ds-success">${successes}✓</span> /
      <span class="ds-fail">${failures}✗</span>
    `;
  }

  overlay.classList.add("active");
}

/**
 * Remove any death-save overlay from a user's card.
 */
function clearDeathSaveOverlay(userId) {
  const card = document.querySelector(`.player-card[data-user-id="${userId}"]`);
  if (!card) return;

  const overlay = card.querySelector(".death-save-overlay");
  if (overlay) overlay.remove();
}
