#!/usr/bin/env node
/**
 * Publish firestore.rules using the Admin SDK service account.
 *
 * `firebase deploy --only firestore:rules` also wants
 * roles/serviceusage.serviceUsageConsumer so it can check that the Firestore
 * API is enabled. The Admin SDK key does not carry that role, and granting it
 * would widen the key for a check we do not need. The Rules API on its own is
 * enough, so this talks to it directly.
 *
 * Usage:
 *   npm run publish-rules -- ~/Downloads/<service-account>.json
 */

import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [credPath, rulesPath = 'firestore.rules', projectId = 'guestbook-40634'] =
  process.argv.slice(2);

if (!credPath) {
  console.error('\n  ✕ pass the path to the service-account JSON\n');
  process.exit(1);
}
const account = JSON.parse(await readFile(credPath, 'utf8'));
const source = await readFile(rulesPath, 'utf8');

const b64u = (s) => Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const now = Math.floor(Date.now()/1000);
const body = `${b64u(JSON.stringify({alg:'RS256',typ:'JWT'}))}.${b64u(JSON.stringify({
  iss: account.client_email,
  scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now, exp: now + 3600,
}))}`;
const signer = createSign('RSA-SHA256'); signer.update(body);
const assertion = `${body}.${signer.sign(account.private_key, 'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}`;

const tok = await (await fetch('https://oauth2.googleapis.com/token', {
  method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body: new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion}),
})).json();
if (!tok.access_token) { console.error('token failed:', JSON.stringify(tok).slice(0,300)); process.exit(1); }

const H = { Authorization:`Bearer ${tok.access_token}`, 'Content-Type':'application/json' };

// 1. Upload the ruleset source.
const rsRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
  method:'POST', headers:H,
  body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: source }] } }),
});
const ruleset = await rsRes.json();
if (!rsRes.ok) { console.error('ruleset rejected:', JSON.stringify(ruleset, null, 2).slice(0, 1500)); process.exit(1); }
console.log('ruleset created:', ruleset.name);

// 2. Point the live release at it.
const relRes = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
  { method:'PATCH', headers:H, body: JSON.stringify({ release: {
      name: `projects/${projectId}/releases/cloud.firestore`, rulesetName: ruleset.name } }) }
);
const rel = await relRes.json();
if (!relRes.ok) { console.error('release failed:', JSON.stringify(rel).slice(0,600)); process.exit(1); }
console.log('✓ published:', rel.rulesetName);
