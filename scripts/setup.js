#!/usr/bin/env node
/**
 * Downloads CSInterface.js (Adobe CEP 12) from the official CEP-Resources
 * GitHub repo into lib/ so the panel can load it.
 *
 * Run once: npm run setup
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const LIB_DIR = path.join(__dirname, '..', 'lib');
const DEST    = path.join(LIB_DIR, 'CSInterface.js');
const SRC_URL =
  'https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_12.x/CSInterface.js';

if (!fs.existsSync(LIB_DIR)) {
  fs.mkdirSync(LIB_DIR, { recursive: true });
}

if (fs.existsSync(DEST)) {
  console.log('CSInterface.js already present — nothing to do.');
  process.exit(0);
}

console.log('Downloading CSInterface.js (CEP 12)…');

const file = fs.createWriteStream(DEST);

https.get(SRC_URL, function (res) {
  if (res.statusCode !== 200) {
    fs.unlink(DEST, function () {});
    console.error('Download failed: HTTP ' + res.statusCode);
    process.exit(1);
  }

  res.pipe(file);

  file.on('finish', function () {
    file.close(function () {
      console.log('Done → lib/CSInterface.js');
    });
  });
}).on('error', function (err) {
  fs.unlink(DEST, function () {});
  console.error('Download error:', err.message);
  process.exit(1);
});
