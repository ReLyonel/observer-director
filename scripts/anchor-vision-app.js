/**
 * INSTRUCCIONES DE USO — AnchorVisionApp
 * ----------------------------------------
 * 1. Abre el panel desde: Controles de Escena > ícono de cámara, o ejecuta en consola:
 *    game.modules.get('observer-director').api.openAnchorPanel()
 *
 * 2. Selecciona el personaje del jugador cuya posición quieres mantener como foco de cámara.
 *
 * 3. Haz clic en "Fijar Visión". La cámara se centrará en ese token y lo mantendrá
 *    seleccionado incluso si haces clic accidentalmente en otras partes del mapa.
 *    Esto evita que el módulo Levels desplace la cámara verticalmente al perder la
 *    elevación de referencia del token.
 *
 * 4. Haz clic en "Liberar" para desactivar el anclaje y recuperar control normal.
 *
 * MODO STREAM:
 * - Actívalo manualmente: ObserverDirector.setStreamMode(true)
 * - Actívalo por URL:     https://tu-servidor/game?stream=true
 * - Con anchor panel:     https://tu-servidor/game?stream=true&anchor=true
 * - Los retratos de Ginzzzu Portraits siempre permanecen visibles en este modo.
 */

const MODULE_ID = "observer-director";

export class AnchorVisionApp extends Application {
  constructor(options = {}) {
    super(options);
    this._anchoredTokenId = null;
    this._selectedTokenId = null;
    this._anchorHookId = null;
    this._sceneHookIds = [];
    this._registerSceneHooks();
    this._onControlToken = this._onControlToken.bind(this);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "observer-director-anchor-vision",
      title: game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.title"),
      template: `modules/${MODULE_ID}/templates/anchor-app.hbs`,
      width: 360,
      height: "auto",
      classes: ["observer-director", "anchor-vision-app"],
      popOut: true,
      resizable: false
    });
  }

  getData() {
    const tokens = this._getEligibleTokens();
    if (!this._selectedTokenId && tokens.length) {
      this._selectedTokenId = tokens[0].id;
    }
    if (this._selectedTokenId && !tokens.some((token) => token.id === this._selectedTokenId)) {
      this._selectedTokenId = null;
    }
    return {
      anchoredTokenId: this._anchoredTokenId,
      selectedTokenId: this._selectedTokenId,
      hasTokens: tokens.length > 0,
      tokens,
      canAnchor: this._canAnchor(tokens),
      selectPlaceholder: game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.selectPlaceholder"),
      noTokensLabel: game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.noTokens"),
      anchorLabel: game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.btnAnchor"),
      releaseLabel: game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.btnRelease"),
      statusText: this._getStatusText(tokens)
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (this._selectedTokenId) {
      html.find("[name='anchor-token']").val(this._selectedTokenId);
    }

    html.find("[name='anchor-token']").on("change", (event) => {
      this._selectedTokenId = event.currentTarget.value || null;
      html.find("[data-action='anchor']").prop("disabled", !this._canAnchor(this._getEligibleTokens()));
    });
    html.find("[data-action='anchor']").on("click", () => this._onAnchorToken(html));
    html.find("[data-action='release']").on("click", () => this._releaseAnchor());
  }

  async close(options = {}) {
    this._disableControlTokenHook();
    for (const hookData of this._sceneHookIds) {
      Hooks.off(hookData.hook, hookData.id);
    }
    this._sceneHookIds = [];
    return super.close(options);
  }

  _registerSceneHooks() {
    const rerender = () => {
      if (this.rendered) this.render(false);
    };

    this._sceneHookIds.push({ hook: "updateScene", id: Hooks.on("updateScene", rerender) });
    this._sceneHookIds.push({ hook: "createToken", id: Hooks.on("createToken", () => this._onTokenCollectionUpdate()) });
    this._sceneHookIds.push({ hook: "deleteToken", id: Hooks.on("deleteToken", (tokenDoc) => this._onDeleteToken(tokenDoc)) });
  }

  _onTokenCollectionUpdate() {
    if (!canvas?.ready) return;
    if (this.rendered) this.render(false);
  }

  _onDeleteToken(tokenDoc) {
    if (!canvas?.ready) return;

    if (this._anchoredTokenId && tokenDoc?.id === this._anchoredTokenId) {
      this._releaseAnchor({ notify: false });
      ui.notifications?.warn(game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.released"));
    }

    if (this.rendered) this.render(false);
  }

  _getEligibleTokens() {
    if (!canvas?.ready) return [];

    const tokenDocs = canvas.scene?.tokens?.contents ?? [];
    return tokenDocs
      .filter((doc) => doc.actor?.type === "character" && doc.disposition !== CONST.TOKEN_DISPOSITIONS.HOSTILE)
      .map((doc) => ({ id: doc.id, name: doc.name }));
  }

  _getStatusText(tokens) {
    if (!tokens.length) return game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.noTokens");
    if (!this._anchoredTokenId) return "";

    const anchored = tokens.find((token) => token.id === this._anchoredTokenId);
    if (!anchored) return game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.released");

    return game.i18n.format("OBSERVER_DIRECTOR.anchorApp.anchoredTo", { name: anchored.name });
  }

  _canAnchor(tokens) {
    if (!this._selectedTokenId) return false;
    return tokens.some((token) => token.id === this._selectedTokenId);
  }

  async _onAnchorToken(html) {
    if (!canvas?.ready) return;

    const tokenId = this._selectedTokenId ?? html.find("[name='anchor-token']").val();
    if (!tokenId) return;

    const validTokens = this._getEligibleTokens();
    if (!validTokens.some((tokenData) => tokenData.id === tokenId)) return;

    const token = canvas.tokens.get(tokenId);
    if (!token) return;

    token.control({ releaseOthers: true });
    await canvas.animatePan({ x: token.x, y: token.y, scale: 1, duration: 600 });

    this._anchoredTokenId = token.id;
    this._selectedTokenId = token.id;
    this._enableControlTokenHook();
    this.render(false);
  }

  _releaseAnchor({ notify = true } = {}) {
    this._anchoredTokenId = null;
    this._selectedTokenId = null;
    this._disableControlTokenHook();

    if (notify) {
      ui.notifications?.info(game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.released"));
    }

    if (this.rendered) this.render(false);
  }

  _enableControlTokenHook() {
    if (this._anchorHookId !== null) return;
    this._anchorHookId = Hooks.on("controlToken", this._onControlToken);
  }

  _disableControlTokenHook() {
    if (this._anchorHookId === null) return;
    Hooks.off("controlToken", this._anchorHookId);
    this._anchorHookId = null;
  }

  _onControlToken(token, controlled) {
    if (this._anchoredTokenId === null) return;
    if (!controlled && token.id === this._anchoredTokenId) {
      setTimeout(() => {
        const t = canvas.tokens.get(this._anchoredTokenId);
        if (t) t.control({ releaseOthers: true });
      }, 0);
    }
  }
}

export function registerAnchorVisionControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControls = controls.find((control) => control.name === "token");
    if (!tokenControls) return;

    tokenControls.tools.push({
      name: "anchor-vision-app",
      title: game.i18n.localize("OBSERVER_DIRECTOR.anchorApp.title"),
      icon: "fas fa-camera",
      button: true,
      visible: game.user.isGM,
      onClick: () => new AnchorVisionApp().render(true)
    });
  });
}

export function registerAnchorVisionApi() {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;

  module.api = {
    ...(module.api ?? {}),
    openAnchorPanel: () => new AnchorVisionApp().render(true)
  };

  // Alias legacy: los IDs antiguos del módulo ya no son válidos tras el renombrado.
}
