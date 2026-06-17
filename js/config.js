(function () {
  'use strict';

  var fs   = require('fs');
  var path = require('path');
  var os   = require('os');

  var CONFIG_DIR  = path.join(os.homedir(), '.jasper-ae-panel');
  var CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

  window.JasperConfig = {
    load: function () {
      try {
        if (fs.existsSync(CONFIG_FILE)) {
          return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
      } catch (e) {}
      return {};
    },

    save: function (updates) {
      try {
        if (!fs.existsSync(CONFIG_DIR)) {
          fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        var merged = Object.assign({}, this.load(), updates);
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
        return true;
      } catch (e) {
        return false;
      }
    }
  };
})();
