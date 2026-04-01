/**
 * INSTRUCCIONES DE USO — AnchorVisionApp
 * ----------------------------------------
 * 1. Abre el panel desde: Controles de Escena > ícono de cámara, o ejecuta en consola:
 *    game.modules.get('stream-director').api.openAnchorPanel()
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
 * - Actívalo manualmente: StreamDirector.setStreamMode(true)
 * - Actívalo por URL:     https://tu-servidor/game?stream=true
 * - Con anchor panel:     https://tu-servidor/game?stream=true&anchor=true
 * - Los retratos de Ginzzzu Portraits siempre permanecen visibles en este modo.
 */

const MODULE_ID = "stream-director";

export class StreamDirector {
  static setStreamMode(active) {
    const isActive = Boolean(active);
    document.body.classList.toggle("stream-mode", isActive);

    const key = isActive
      ? "STREAM_DIRECTOR.streamMode.activated"
      : "STREAM_DIRECTOR.streamMode.deactivated";

    ui.notifications?.info(game.i18n.localize(key));
    Hooks.callAll("streamModeChanged", isActive);
    return isActive;
  }
}

export function registerStreamDirectorApi() {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;

  module.api = {
    ...(module.api ?? {}),
    StreamDirector,
    setStreamMode: (active) => StreamDirector.setStreamMode(active)
  };

  globalThis.StreamDirector = StreamDirector;
  // Alias legacy: game.modules.get('observers-director') ya no es válido tras el renombrado.
}
