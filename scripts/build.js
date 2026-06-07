#!/usr/bin/env node
/**
 * Packages the panel into a signed ZXP → dist/jasper-panel.zxp
 *
 * Prerequisites:
 *   1. ZXPSignCmd at scripts/ZXPSignCmd (or .exe on Windows), or in your PATH
 *      Download: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
 *   2. cert.p12 — generate once with: npm run create-cert
 *   3. lib/CSInterface.js — fetch once with: npm run setup
 *
 * Usage:
 *   CERT_PASSWORD=yourpassword npm run build
 *
 * Environment variables:
 *   CERT_PASSWORD  (required) Password for cert.p12
 *   CERT_PATH      (optional) Path to .p12 file — defaults to cert.p12 in project root
 */

'use strict';

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const DIST   = path.join(ROOT, 'dist');
const STAGE  = path.join(DIST, '_stage');
const OUTPUT = path.join(DIST, 'jasper-panel.zxp');
const TSA    = 'http://timestamp.digicert.com';

const CERT_PATH = process.env.CERT_PATH || path.join(ROOT, 'cert.p12');
const CERT_PASS = process.env.CERT_PASSWORD;

// Only these entries are included in the ZXP
const PANEL_ENTRIES = ['CSXS', 'css', 'host', 'js', 'lib', 'index.html'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function abort(msg) {
  console.error('\nBuild error:', msg, '\n');
  process.exit(1);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.error)    abort(`Could not run ${cmd}: ${r.error.message}`);
  if (r.status !== 0) abort(`${cmd} exited with status ${r.status}`);
}

function findZXPSignCmd() {
  const localName = process.platform === 'win32' ? 'ZXPSignCmd.exe' : 'ZXPSignCmd';
  const localPath = path.join(__dirname, localName);
  if (fs.existsSync(localPath)) return localPath;

  // Fall back to system PATH
  const probe = spawnSync(localName, [], { stdio: 'pipe' });
  return probe.error ? null : localName;
}

// ── Preflight ─────────────────────────────────────────────────────────────────

if (!CERT_PASS) {
  abort(
    'CERT_PASSWORD is not set.\n' +
    '  Usage: CERT_PASSWORD=yourpassword npm run build'
  );
}

if (!fs.existsSync(CERT_PATH)) {
  abort(
    `Certificate not found: ${CERT_PATH}\n` +
    '  Generate one with: npm run create-cert'
  );
}

if (!fs.existsSync(path.join(ROOT, 'lib', 'CSInterface.js'))) {
  abort('lib/CSInterface.js is missing. Run: npm run setup');
}

const zxpCmd = findZXPSignCmd();
if (!zxpCmd) {
  abort(
    'ZXPSignCmd not found.\n' +
    '  Download from: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD\n' +
    '  Place the binary at scripts/ZXPSignCmd  (or scripts/ZXPSignCmd.exe on Windows)'
  );
}

// ── Stage extension files ─────────────────────────────────────────────────────

console.log('Staging extension files…');

if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(STAGE, { recursive: true });

for (const entry of PANEL_ENTRIES) {
  const src  = path.join(ROOT, entry);
  const dest = path.join(STAGE, entry);
  if (!fs.existsSync(src)) abort(`Missing required entry: ${entry}`);
  fs.cpSync(src, dest, { recursive: true });
}

// ── Sign ─────────────────────────────────────────────────────────────────────

console.log('Signing…');
run(zxpCmd, ['-sign', STAGE, OUTPUT, CERT_PATH, CERT_PASS, '-tsa', TSA]);

fs.rmSync(STAGE, { recursive: true });

const kb = Math.round(fs.statSync(OUTPUT).size / 1024);
console.log(`\nDone → dist/jasper-panel.zxp (${kb} KB)`);
