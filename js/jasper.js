(function () {
  'use strict';

  var https = require('https');

  /**
   * Makes an HTTPS request using Node.js (bypasses browser CORS restrictions).
   * Returns a Promise that resolves with the parsed JSON body.
   */
  function request(method, path, apiKey, body) {
    return new Promise(function (resolve, reject) {
      var payload = body ? JSON.stringify(body) : null;

      var options = {
        hostname: 'api.jasper.ai',
        path: path,
        method: method,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (payload) {
        options.headers['Content-Length'] = Buffer.byteLength(payload);
      }

      var req = https.request(options, function (res) {
        var data = '';
        res.on('data', function (chunk) { data += chunk; });
        res.on('end', function () {
          var parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            reject(new Error('Invalid JSON from Jasper API'));
            return;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            var err = new Error('Jasper API error: ' + res.statusCode);
            err.status = res.statusCode;
            err.body = parsed;
            reject(err);
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  window.JasperAPI = {
    /**
     * Fetches all brand voice (tone) profiles for the authenticated workspace.
     * Non-metered — does not consume API credits.
     * Returns an array of { id, title/name, description } objects.
     */
    fetchTones: function (apiKey) {
      return request('GET', '/v1/tone', apiKey, null).then(function (data) {
        if (Array.isArray(data))              return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.tones)) return data.tones;
        return [];
      });
    },

    /**
     * Generates copy via POST /v1/command.
     * @param {string}      apiKey
     * @param {string}      command  — the artist's prompt
     * @param {string|null} toneId   — Jasper brand voice ID
     * @param {string|null} context  — AE comp/layer context string
     */
    generateCopy: function (apiKey, command, toneId, context) {
      var body = {
        inputs: { command: command },
        options: {
          outputCount: 1,
          completionType: 'quality'
        }
      };

      if (toneId)  body.inputs.toneId  = toneId;
      if (context) body.inputs.context = context;

      return request('POST', '/v1/command', apiKey, body).then(function (data) {
        var outputs = data.data || data.outputs || [];
        if (outputs.length > 0) {
          var out = outputs[0];
          if (typeof out === 'string') return out;
          if (out.text)  return out.text;
          if (out.value) return out.value;
        }
        throw new Error('No output in Jasper API response');
      });
    }
  };
})();
