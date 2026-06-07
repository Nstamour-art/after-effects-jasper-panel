# After Effects Jasper Panel

Generate on-brand copy without leaving your timeline. This panel brings Jasper AI directly into After Effects — type a request, get copy back in seconds, and insert it into a text layer with one click.

No context switching. No waiting on a strategist. No style guide archaeology. Your brand voice is already baked in.

<!-- Screenshot: panel docked alongside the AE timeline -->
<!-- ![Panel overview](docs/screenshots/panel-overview.png) -->

---

## What it does

An artist working on a lower third, title card, or regional campaign variant opens the Jasper panel inside After Effects. They pick a brand voice from their workspace, type what they need, and the copy comes back on-brand in seconds. If a text layer is selected, one click inserts it directly — font, size, and style stay intact. Nothing leaves the app.

**Key features:**

- **Brand voice dropdown** — pulls your team's Tone profiles from Jasper IQ automatically, no manual config
- **AE context awareness** — the panel reads your active comp and selected layer name, passing that as context to Jasper so the output fits the format (short for a lower-third, longer for a title card)
- **Insert to Layer** — updates a selected text layer in place, or creates a new one named *Jasper Copy*
- **Undo-safe** — every insert is wrapped in an AE undo group, so ⌘Z works as expected
- **Persistent settings** — API key and last-used brand voice are remembered across sessions

<!-- Screenshot: generating copy for a lower-third -->
<!-- ![Generating copy](docs/screenshots/generate-lower-third.png) -->

<!-- Screenshot: Insert to Layer updating a text layer in the timeline -->
<!-- ![Insert to layer](docs/screenshots/insert-to-layer.png) -->

---

## Requirements

- After Effects 25.0 (2024) or later
- Jasper **Business** plan with API access
- Node.js 16+ (for the one-time setup step only)

---

## Setup

### 1. Enable unsigned extensions

CEP requires a one-time change per machine to load developer extensions.

**macOS:**
```bash
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

**Windows** (PowerShell as Administrator):
```powershell
New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.12" `
  -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force
```

Restart After Effects after running this.

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

This fetches Adobe's CEP bridge library into `lib/CSInterface.js`. Required once.

### 4. Get your API key

Go to `app.jasper.ai → Settings → Dev Tools → API Tokens` and create a token. You'll need Admin or Developer role in your Jasper workspace.

### 5. Open the panel

Launch After Effects → **Window → Extensions → Jasper**

Paste your API key when prompted. The panel validates it, saves it locally, and populates the brand voice dropdown from your workspace. You're ready to generate.

<!-- Tutorial: full setup walkthrough video -->
<!-- [![Setup walkthrough](docs/screenshots/setup-thumbnail.png)](YOUR_VIDEO_URL) -->

---

## Using the panel

<!-- Screenshot: annotated panel UI with callouts -->
<!-- ![Panel UI annotated](docs/screenshots/panel-annotated.png) -->

1. **Pick a Brand Voice** from the dropdown — these are your team's Tone profiles from Jasper IQ
2. **Select a text layer** in the timeline (optional, but gives the AI better context)
3. **Type your request** — e.g. *"Write a lower-third for the opening segment"* or *"Three title card options for the regional launch"*
4. **Press Generate** (or ⌘↵ / Ctrl+Enter)
5. **Click Insert to Layer** — copy lands in the selected text layer, or creates a new one

To update your API key or switch workspaces, click the ⚙ icon in the top-right corner of the panel.

---

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Panel UI | HTML / CSS / vanilla JS | Runs in CEP 12's embedded Chromium |
| API calls | Node.js `https` module | Direct from panel — no proxy, no CORS issues |
| AE integration | ExtendScript (ES5) | Bridge via `CSInterface.evalScript()` |
| Config | `~/.jasper-ae-panel/config.json` | API key + last selected tone |
| Brand voices | `GET /v1/tone` | Non-metered; fetched on panel load |
| Copy generation | `POST /v1/command` | Passes `toneId` + AE comp/layer context |

**Why CEP and not UXP?**
After Effects does not yet support UXP panels as of 2026 — Premiere Pro only received UXP in December 2025, and AE has no announced ship date. CEP 12 ships with AE 25+ and will remain supported for years. The panel will migrate to UXP when Adobe ships it for After Effects.

---

## Contributing

<!-- Add contribution guidelines here -->

## License

Apache 2.0 — see [LICENSE](LICENSE).

