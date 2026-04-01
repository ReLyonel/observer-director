/**
 * @file scripts/settings.js
 * @description Registers all Observer Director Pro settings in one place.
 */

import { JB2ASettingsForm } from "./jb2aSettings.js";


const MODULE_ID = "observer-director";

/**
 * Register all module settings (world scope).
 */
export function registerModuleSettings() {

    // Toggle: Enable observer mode (controls whether macro is created)
    game.settings.register(MODULE_ID, "enabled", {
        name: "Enable Observer Mode",
        hint: "If enabled, a macro will be generated to open the Observer Window.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    // Toggle: Camera follow (if disabled, observer camera is fixed)
    game.settings.register("observer-director", "cameraFollow", {
        name: "Enable Camera Follow",
        hint: "If enabled, the observer camera follows the GM’s movements. Disable for live-play displays where you want a fixed view.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });


    // Dropdown: Observer window resolution
    game.settings.register(MODULE_ID, "windowSize", {
        name: "Observer Window Size",
        hint: "Choose the resolution for the observer window opened by the macro.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "1080p": "1920 × 1080 (1080p)",
            "1440p": "2560 × 1440 (1440p)",
            "4k": "3840 × 2160 (4K)"
        },
        default: "1080p"
    });

    // Toggle GM card on/off
    game.settings.register(MODULE_ID, "gmCardEnabled", {
        name: "Enable GM Card",
        hint: "Show a GM card in the observer HUD.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    // GM portrait image
    game.settings.register(MODULE_ID, "gmCardImage", {
        name: "GM Card Image",
        hint: "Choose an image to display on the GM card.",
        scope: "world",
        config: true,
        type: String,
        default: "icons/svg/mystery-man.svg",
        filePicker: "image"
    });

    // GM title text
    game.settings.register(MODULE_ID, "gmCardTitle", {
        name: "GM Card Title",
        hint: "Title shown on the GM card (e.g., GM, Dungeon Master, Storyteller).",
        scope: "world",
        config: true,
        type: String,
        default: "Game Master"
    });


    // Number: Duration of scene banner display
    game.settings.register(MODULE_ID, "bannerDuration", {
        name: "Scene Banner Duration",
        hint: "How long (in seconds) the scene banner should be shown in the observer window.",
        scope: "world",
        config: true,
        type: Number,
        default: 3,
        range: { min: 1, max: 10, step: 1 }
    });

    // Number: Duration of chat message bubbles
    game.settings.register("observer-director", "chatBubbleDuration", {
        name: "Chat Bubble Duration",
        hint: "How long (in seconds) chat bubbles should stay visible above player cards.",
        scope: "world",
        config: true,
        type: Number,
        default: 10,
        range: { min: 3, max: 30, step: 1 }
    });


    // Dropdown: Font for scene banner title
    game.settings.register(MODULE_ID, "bannerFont", {
        name: "Scene Banner Font",
        hint: "Choose the font used for the scene title banner in observer mode.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "Signika": "Signika (Default)",
            "Modesto Condensed": "Modesto Condensed",
            "Modesto Expanded": "Modesto Expanded",
            "Roboto": "Roboto",
            "Georgia": "Georgia",
            "Times New Roman": "Times New Roman"
        },
        default: "Signika"
    });

    game.settings.registerMenu("observer-director", "jb2aMenu", {
        name: "JB2A Configuration",
        label: "Configure JB2A Effects",
        hint: "Optional: Install JB2A (free or Patreon) for animated effects.\n" +
            "Combine with Filepicker+ for thumbnail previews.\n" +
            "Leave blank to use default system icons.",
        icon: "fas fa-magic",
        type: JB2ASettingsForm,
        restricted: true
    });

    game.settings.register("observer-director", "jb2aDamage", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aHeal", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aBlinded", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aPoisoned", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aStunned", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aUnconscious", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aFrightened", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aRestrained", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aProne", { scope: "world", config: false, type: String, default: "" });
    game.settings.register("observer-director", "jb2aCharmed", { scope: "world", config: false, type: String, default: "" });

}


