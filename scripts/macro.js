/**
 * @file scripts/macro.js
 * @description Ensures the Observer Window macro exists and stays up to date.
 * - Reads settings like "enabled" and "windowSize" (registered elsewhere).
 */

const MODULE_ID = "stream-director";
const MACRO_NAME = "Open Observer Window";

/**
 * Hook to create/update the macro on startup.
 * Only runs for the GM and if the feature is enabled.
 */
export function registerMacroHook() {
  console.log("Observer | registerMacroHook() running");

  // Only run for GMs
  if (!game.user?.isGM) return;

  const enabled = game.settings.get(MODULE_ID, "enabled");
  if (!enabled) {
    console.log("Observer | Macro creation skipped: setting disabled");
    return;
  }

  ensureObserverMacro();
}

/**
 * Create or update the macro for opening the observer window.
 */
async function ensureObserverMacro() {
  let macro = game.macros.find((m) => m.name === MACRO_NAME);
  const command = buildMacroCommand();

  // Cross-version compatible observer level
  const OWN = (foundry?.CONST?.DOCUMENT_OWNERSHIP_LEVELS) ?? (globalThis?.CONST?.DOCUMENT_OWNERSHIP_LEVELS);
  const OBS = OWN?.OBSERVER ?? 2;

  if (!macro) {
    console.log("Observer | Creating observer macro…");
    macro = await Macro.create({
      name: MACRO_NAME,
      type: "script",
      scope: "global",
      command,
      img: "modules/stream-director/assets/LogoSC.jpg",
      ownership: { default: OBS }
    });
    ui.notifications?.info("📺 Observer Window macro created.");
    return;
  }

  if ((macro.command || "").trim() !== command.trim()) {
    console.log("Observer | Updating existing observer macro command…");
    await macro.update({ command });
    ui.notifications?.info("📺 Observer Window macro updated.");
  }
}

/**
 * Build the actual macro script as a string.
 * - Reads "windowSize" setting
 * - Opens a new observer tab with ?observer=true
 * @returns {string}
 */
function buildMacroCommand() {
  return `
/**
 * Stream Director — Open Observer Window
 * - Reads "Observer Window Size" from settings.
 * - Appends ?observer=true so the ES module boots in observer mode.
 */
try {
  const size = game.settings.get("${MODULE_ID}", "windowSize");

  // Defaults (1080p)
  let width = 1920, height = 1080;
  if (size === "1440p") { width = 2560; height = 1440; }
  else if (size === "4k") { width = 3840; height = 2160; }

  const url = new URL(window.location.href);
  url.searchParams.set("observer", "true");

  const features = [
    "resizable=yes",
    "left=0",
    "top=0",
    "noopener=yes",
    "noreferrer=yes"
  ];
  features.push(\`width=\${width}\`, \`height=\${height}\`);

  const win = window.open(url.toString(), "_blank", features.join(","));

  // Some browsers return null even if the tab opens successfully
  if (!win) {
    console.warn("Observer | window.open returned null. May still have opened.");
    // Optionally: comment this out to suppress the warning
    // ui.notifications?.warn("Could not open Observer Window. Please allow popups for this site.");
  } else {
    console.log("Observer | Observer window opened at", width + "×" + height);
  }

} catch (err) {
  console.error("Observer | Failed to open observer window:", err);
  ui.notifications?.error("Observer Window macro failed — see console for details.");
}
`.trim();
}
