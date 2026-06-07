# After Effects Jasper Panel

A lightweight Jasper AI chat panel built directly into After Effects. Generate on-brand copy for lower thirds, title cards, and motion graphics — without leaving your timeline.

## Requirements

- After Effects 25.0 (2024) or later
- Jasper **Business** plan (API access required)
- Node.js 16+ (for the one-time setup step only)

## Setup

### 1. Enable unsigned extensions

CEP requires a one-time registry/defaults change to load unsigned extensions during development.

**macOS:**
```bash
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

**Windows** (PowerShell as Administrator):
```powershell
New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.12" `
  -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force
```

Restart After Effects after running this command.

### 2. Place the extension

**macOS:**
```bash
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
ln -s /path/to/after-effects-jasper-panel \
  ~/Library/Application\ Support/Adobe/CEP/extensions/jasper-panel
```

**Windows:**
Copy the project folder to `%APPDATA%\Adobe\CEP\extensions\` and name it `jasper-panel`.

### 3. Download CSInterface.js

```bash
npm run setup
```

This fetches Adobe's CEP bridge library into `lib/CSInterface.js` (required once).

### 4. Open the panel

Launch After Effects → **Window → Extensions → Jasper**

On first launch you'll be prompted for your API key. Find it at
`app.jasper.ai → Settings → Dev Tools → API Tokens`
(requires Admin or Developer role in your Jasper workspace).

The panel saves the key locally at `~/.jasper-ae-panel/config.json` and immediately
fetches your workspace's brand voices. You're ready.

---

## Using the panel

1. Pick a **Brand Voice** from the dropdown (your Jasper workspace's Tone profiles)
2. Type what you need — e.g. *"Write a lower-third for the opening segment"*
3. Press **Generate** (or ⌘↵ / Ctrl+Enter)
4. Click **Insert to Layer**
   - If a text layer is selected in the timeline, the copy replaces its text while preserving font and style
   - Otherwise a new text layer named *Jasper Copy* is created in the active comp

**Undo works:** Insert is wrapped in an undo group, so ⌘Z removes it cleanly.

---

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Panel UI | HTML / CSS / vanilla JS | Runs in CEP 12's embedded Chromium |
| API calls | Node.js `https` module | Direct — no proxy process, no CORS issues |
| AE integration | ExtendScript (ES5) | Bridge via `CSInterface.evalScript()` |
| Config | `~/.jasper-ae-panel/config.json` | API key + last selected tone |
| Jasper brand voices | `GET /v1/tone` | Non-metered; fetched on panel load |
| Copy generation | `POST /v1/command` | Passes `toneId` + AE comp/layer context |

**Why CEP, not UXP?**
As of 2026, After Effects does not yet support UXP panels — Premiere Pro only received UXP
in December 2025, and AE has no announced ship date. CEP 12 ships with AE 25+ and will
remain supported for years. The panel will migrate to UXP when Adobe ships it for AE.
