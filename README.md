# Observer Director Pro

## Migración desde stream-director
> Si usabas stream-director, desinstálalo antes de instalar Observer Director Pro.  
> Los ajustes de configuración NO se migran automáticamente en esta versión.

Observer Director Pro es un módulo de Foundry VTT que crea una **Observer Window** limpia y cinemática para streaming y partidas en directo.

Diseñado para Foundry VTT **v13.351**.

---

## ✨ Features

- **Observer Mode**
  - Launch an overlay-only window with a single macro.
  - Hides GM UI chrome (sidebar, navigation, controls, etc.).
  - Scales cleanly across 1080p, 1440p, and 4K.

- **Anchor Vision Panel**
  - Floating panel to lock camera focus to a friendly character token.
  - Includes anti-unanchor hook for Levels compatibility.

- **Stream Mode**
  - Toggle clean stream UI via API (`ObserverDirector.setStreamMode(true)`) or URL (`?stream=true`).
  - Keeps Ginzzzu Portraits visible with explicit CSS exclusions.

- **Scene Banner / Player HUD / Chat Bubbles / Roll Overlay**
  - Existing observer features remain available.

- **Epic Rolls 5e Integration**
  - Observer mirrors dispatch/update/end/toggle events.

- **JB2A Integration (optional)**
  - Configure animated condition effects.

- **Camera Sync**
  - Observer camera follows GM view via socketlib.

---

## ⚙️ Settings

Accessible under **Game Settings → Module Settings → Observer Director Pro**.

---

## 🖥️ Usage

1. As GM, launch Foundry normally.
2. Use the **“Open Observer Window”** macro.
3. The observer opens in a new window with `?observer=true`.
4. Optional stream bootstrap:
   - `?stream=true`
   - `?stream=true&anchor=true`

---

## 📦 Installation

Manifest URL:

`https://raw.githubusercontent.com/ReLyonel/observer-director/main/module.json`

Or install with module metadata:

```json
{
  "id": "observer-director",
  "title": "Observer Director Pro",
  "description": "Ventana de observador cinemática para Foundry VTT.",
  "version": "1.0.0",
  "compatibility": {
    "minimum": "13",
    "verified": "13.351"
  }
}
```
