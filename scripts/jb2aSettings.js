/**
 * @file scripts/jb2aSettings.js
 * @description Custom form for configuring JB2A animations for damage, healing, and core conditions.
 */

export class JB2ASettingsForm extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "jb2a-settings-form",
            title: "JB2A Configuration",
            template: "modules/observer-director/templates/jb2a-settings.hbs",
            width: 800,
            height: "auto",
            classes: ["form", "sheet", "settings"],
        });
    }


    getData() {
        return {
            damage: game.settings.get("observer-director", "jb2aDamage"),
            heal: game.settings.get("observer-director", "jb2aHeal"),
            blinded: game.settings.get("observer-director", "jb2aBlinded"),
            poisoned: game.settings.get("observer-director", "jb2aPoisoned"),
            stunned: game.settings.get("observer-director", "jb2aStunned"),
            unconscious: game.settings.get("observer-director", "jb2aUnconscious"),
            frightened: game.settings.get("observer-director", "jb2aFrightened"),
            restrained: game.settings.get("observer-director", "jb2aRestrained"),
            prone: game.settings.get("observer-director", "jb2aProne"),
            charmed: game.settings.get("observer-director", "jb2aCharmed")
        };
    }

    // Handle clicks on file picker buttons
    activateListeners(html) {
        super.activateListeners(html);

        html.find(".file-picker").click(ev => {
            ev.preventDefault();

            const target = ev.currentTarget.dataset.target;
            const input = html.find(`input[name="${target}"]`);

            // ✅ Make sure we have an input, otherwise use a safe fallback
            const current = input.length ? input.val() : "";

            new FilePicker({
                type: "any",
                current,
                callback: path => {
                    if (input.length) input.val(path); // only set if the input exists
                }
            }).render(true);
        });
    }

    async _updateObject(event, formData) {
        for (let [k, v] of Object.entries(formData)) {
            await game.settings.set("observer-director", k, v);
        }
    }
}