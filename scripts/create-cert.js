#!/usr/bin/env node
/**
 * Generates a self-signed code-signing certificate → cert.p12
 *
 * Run once before your first build. Store cert.p12 and the password
 * somewhere secure (a password manager, CI secrets) — never commit them to git.
 *
 * For CI: base64-encode the file and save it as a GitHub Secret named CERT_P12_BASE64.
 *   macOS/Linux: base64 -i cert.p12 | pbcopy
 *   Windows:     [Convert]::ToBase64String([IO.File]::ReadAllBytes('cert.p12')) | clip
 *
 * Requirements:
 *   ZXPSignCmd at scripts/ZXPSignCmd (or .exe on Windows), or in your PATH
 *   Download: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
 *
 * Usage:
 *   CERT_PASSWORD=yourpassword npm run create-cert
 *
 * Optional env vars:
 *   CERT_COUNTRY   Two-letter country code (default: US)
 *   CERT_STATE     State / province      (default: CA)
 *   CERT_ORG       Organisation name     (default: Jasper Panel)
 *   CERT_NAME      Common name           (default: Jasper Panel Developer)
 */

'use strict';

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'cert.p12');

const CERT_PASS    = process.env.CERT_PASSWORD;
const CERT_COUNTRY = process.env.CERT_COUNTRY || 'US';
const CERT_STATE   = process.env.CERT_STATE   || 'CA';
const CERT_ORG     = process.env.CERT_ORG     || 'Jasper Panel';
const CERT_NAME    = process.env.CERT_NAME    || 'Jasper Panel Developer';

function abort(msg) {
  console.error('\nError:', msg, '\n');
  process.exit(1);
}

function findZXPSignCmd() {
  const localName = process.platform === 'win32' ? 'ZXPSignCmd.exe' : 'ZXPSignCmd';
  const localPath = path.join(__dirname, localName);
  if (fs.existsSync(localPath)) return localPath;
  const probe = spawnSync(localName, [], { stdio: 'pipe' });
  return probe.error ? null : localName;
}

if (!CERT_PASS) {
  abort(
    'CERT_PASSWORD is not set.\n' +
    '  Usage: CERT_PASSWORD=yourpassword npm run create-cert'
  );
}

if (fs.existsSync(OUTPUT)) {
  console.log('cert.p12 already exists. Delete it first to regenerate.');
  process.exit(0);
}

const zxpCmd = findZXPSignCmd();
if (!zxpCmd) {
  abort(
    'ZXPSignCmd not found.\n' +
    '  Download from: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD\n' +
    '  Place the binary at scripts/ZXPSignCmd  (or scripts/ZXPSignCmd.exe on Windows)'
  );
}

console.log('Generating self-signed certificate…');

const r = spawnSync(
  zxpCmd,
  ['-selfSignedCert', CERT_COUNTRY, CERT_STATE, CERT_ORG, CERT_NAME, CERT_PASS, OUTPUT],
  { stdio: 'inherit' }
);

if (r.error)    abort(r.error.message);
if (r.status !== 0) abort('ZXPSignCmd exited with status ' + r.status);

console.log('\nDone → cert.p12');
console.log('Next steps:');
console.log('  1. Store this file and your CERT_PASSWORD in a password manager');
console.log('  2. Add both as GitHub Secrets (CERT_P12_BASE64 and CERT_PASSWORD)');
console.log('     base64 command:  base64 -i cert.p12 | pbcopy');
console.log('  3. Run: CERT_PASSWORD=yourpassword npm run build');
