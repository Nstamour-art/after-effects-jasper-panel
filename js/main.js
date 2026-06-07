(function () {
  'use strict';

  var cs     = null;
  var config = {};

  // ─── Init ────────────────────────────────────────────────────────────────────

  function init() {
    cs     = new CSInterface();
    config = JasperConfig.load();
    applyAETheme();

    document.getElementById('save-key-btn').addEventListener('click', handleSaveKey);
    document.getElementById('api-key-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSaveKey();
    });
    document.getElementById('close-setup-btn').addEventListener('click', function () {
      if (config.apiKey) showMain();
    });

    document.getElementById('settings-btn').addEventListener('click', showSetup);
    document.getElementById('send-btn').addEventListener('click', handleSend);
    document.getElementById('prompt-input').addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
    });

    // Event delegation for Copy / Insert buttons in chat bubbles
    document.getElementById('messages').addEventListener('click', handleMessageAction);

    if (config.apiKey) {
      showMain();
    } else {
      showSetup();
    }
  }

  // Adapt panel background to match AE's current theme colour
  function applyAETheme() {
    try {
      var env = cs.getHostEnvironment();
      var bg  = env.appSkinInfo && env.appSkinInfo.panelBackgroundColor;
      if (bg && bg.color) {
        var c = bg.color;
        document.documentElement.style.setProperty(
          '--bg-panel',
          'rgb(' + Math.round(c.red) + ',' + Math.round(c.green) + ',' + Math.round(c.blue) + ')'
        );
      }
    } catch (e) {}
  }

  // ─── Screen routing ──────────────────────────────────────────────────────────

  function showSetup() {
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');

    // Show the ✕ close button only when already connected
    var closeBtn = document.getElementById('close-setup-btn');
    closeBtn.style.display = config.apiKey ? 'block' : 'none';

    if (config.apiKey) {
      document.getElementById('api-key-input').value = config.apiKey;
    }
    document.getElementById('api-key-input').focus();
  }

  function showMain() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    loadTones();
  }

  // ─── Setup / API key ─────────────────────────────────────────────────────────

  async function handleSaveKey() {
    var key = document.getElementById('api-key-input').value.trim();
    hideSetupError();

    if (!key) {
      showSetupError('Please enter an API key.');
      return;
    }

    var btn = document.getElementById('save-key-btn');
    btn.textContent = 'Connecting…';
    btn.disabled = true;

    try {
      // Validate immediately by fetching tones
      await JasperAPI.fetchTones(key);
      config.apiKey = key;
      JasperConfig.save({ apiKey: key });
      showMain();
    } catch (e) {
      showSetupError(
        e.status === 401
          ? 'Invalid API key. Check and try again.'
          : 'Could not connect to Jasper. Check your network.'
      );
    } finally {
      btn.textContent = 'Connect';
      btn.disabled = false;
    }
  }

  function showSetupError(msg) {
    var el = document.getElementById('setup-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideSetupError() {
    document.getElementById('setup-error').classList.add('hidden');
  }

  // ─── Brand voices ────────────────────────────────────────────────────────────

  async function loadTones() {
    var select = document.getElementById('tone-select');
    select.disabled = true;
    select.innerHTML = '<option value="">Loading brand voices…</option>';

    try {
      var tones = await JasperAPI.fetchTones(config.apiKey);
      select.innerHTML = '';

      if (!tones.length) {
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'No brand voices in this workspace';
        select.appendChild(empty);
      } else {
        tones.forEach(function (tone) {
          var opt = document.createElement('option');
          opt.value       = tone.id || tone.toneId || '';
          opt.textContent = tone.title || tone.name || tone.description || opt.value;
          if (config.lastToneId && opt.value === config.lastToneId) opt.selected = true;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      select.innerHTML = '<option value="">Failed to load — check settings</option>';
      if (e.status === 401) {
        showSetup();
        showSetupError('API key expired or revoked. Please update it.');
      }
    } finally {
      select.disabled = false;
    }

    select.onchange = function () {
      config.lastToneId = select.value;
      JasperConfig.save({ lastToneId: select.value });
    };
  }

  // ─── Generate ────────────────────────────────────────────────────────────────

  function handleSend() {
    var prompt = document.getElementById('prompt-input').value.trim();
    if (!prompt) return;

    var toneId  = document.getElementById('tone-select').value || null;
    var sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

    // Pull AE comp/layer context before generating
    cs.evalScript('getLayerContext()', async function (result) {
      var aeContext = buildAEContext(result);

      appendUserMessage(prompt);
      document.getElementById('prompt-input').value = '';

      var loadingId = appendLoading();

      try {
        var text = await JasperAPI.generateCopy(config.apiKey, prompt, toneId, aeContext);
        replaceLoading(loadingId, text, false);
      } catch (e) {
        var msg =
          e.status === 401 ? 'API key error — check Settings.' :
          e.status === 429 ? 'Rate limit reached. Try again in a moment.' :
          'Something went wrong. Please try again.';
        replaceLoading(loadingId, msg, true);
      } finally {
        sendBtn.disabled = false;
        sendBtn.focus();
      }
    });
  }

  function buildAEContext(evalResult) {
    try {
      var ctx = JSON.parse(evalResult);
      if (!ctx.compName) return null;
      var parts = ['Composition: "' + ctx.compName + '"'];
      if (ctx.layerName) parts.push('Selected layer: "' + ctx.layerName + '"');
      if (ctx.layerType === 'text') parts.push('(text layer — copy will be inserted here)');
      return parts.join('. ');
    } catch (e) {
      return null;
    }
  }

  // ─── Message rendering ───────────────────────────────────────────────────────

  function appendUserMessage(text) {
    var messages = document.getElementById('messages');
    var div    = document.createElement('div');
    div.className = 'message user';
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    div.appendChild(bubble);
    messages.appendChild(div);
    scrollBottom();
  }

  function appendLoading() {
    var id       = 'msg-' + Date.now();
    var messages = document.getElementById('messages');
    var div      = document.createElement('div');
    div.className = 'message assistant';
    div.id        = id;
    div.innerHTML =
      '<div class="loading-dots">' +
        '<span class="dot"></span>' +
        '<span class="dot"></span>' +
        '<span class="dot"></span>' +
      '</div>';
    messages.appendChild(div);
    scrollBottom();
    return id;
  }

  function replaceLoading(id, text, isError) {
    var div = document.getElementById(id);
    if (!div) return;
    div.innerHTML = '';

    var bubble = document.createElement('div');
    bubble.className = isError ? 'bubble error' : 'bubble';
    bubble.textContent = text; // stored as a text node — firstChild for retrieval

    if (!isError) {
      var actions = document.createElement('div');
      actions.className = 'bubble-actions';
      actions.innerHTML =
        '<button class="action-btn" data-action="copy">Copy</button>' +
        '<button class="action-btn" data-action="insert">Insert to Layer</button>';
      bubble.appendChild(actions);
    }

    div.appendChild(bubble);
    scrollBottom();
  }

  // ─── Copy / Insert actions ───────────────────────────────────────────────────

  function handleMessageAction(e) {
    var btn = e.target;
    if (!btn.classList.contains('action-btn')) return;

    var action = btn.dataset.action;
    // firstChild of .bubble is the text node set via textContent
    var text   = btn.closest('.bubble').firstChild.textContent;

    if (action === 'copy') {
      navigator.clipboard.writeText(text).then(function () {
        flashBtn(btn, 'Copied!', false);
      }).catch(function () {
        flashBtn(btn, 'Error', true);
      });
    } else if (action === 'insert') {
      btn.disabled = true;
      cs.evalScript('insertText(' + JSON.stringify(text) + ')', function (result) {
        btn.disabled = false;
        try {
          var res = JSON.parse(result);
          flashBtn(btn, res.success ? 'Inserted!' : (res.error || 'Error'), !res.success);
        } catch (err) {
          flashBtn(btn, 'Error', true);
        }
      });
    }
  }

  function flashBtn(btn, label, isError) {
    var original = btn.textContent;
    btn.textContent = label;
    if (isError) btn.style.color = 'var(--error)';
    setTimeout(function () {
      btn.textContent = original;
      btn.style.color = '';
    }, 1800);
  }

  function scrollBottom() {
    var m = document.getElementById('messages');
    m.scrollTop = m.scrollHeight;
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);
})();
