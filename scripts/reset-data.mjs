#!/usr/bin/env node
/**
 * Clear the working data, keeping the accounts and the configuration.
 *
 * Deletes clients, orders, payments, events, guest books and their messages,
 * albums and their media rows, enquiries, email logs, activity, and the
 * catalogue. Keeps user accounts, username reservations, system settings and
 * email templates, because losing those locks people out or throws away
 * configuration rather than data.
 *
 * Objects already in R2 are listed at the end rather than deleted: the
 * storage credentials live only in the Worker, so they are removed with
 * `wrangler r2 object delete` or from the album gallery.
 *
 * Usage:
 *   node scripts/reset-data.mjs <service-account.json> [--yes]
 */

import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

const [credPath, ...flags] = process.argv.slice(2);
if (!credPath) {
  console.error('\n  ✕ pass the path to the service-account JSON\n');
  process.exit(1);
}

/** Emptied entirely. */
const WIPE = [
  'clients', 'orders', 'payments', 'events',
  'guestbooks', 'messages', 'messageEmails',
  'albums', 'albumMedia',
  'orderRequests', 'emailLogs', 'activityLogs',
  'catalogCategories', 'catalogItems',
];

/** Kept: removing these locks people out or discards configuration. */
const KEEP = ['users', 'usernames', 'settings', 'emailTemplates'];

const account = JSON.parse(await readFile(credPath, 'utf8'));
const projectId = account.project_id;

const b64u = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const iat = Math.floor(Date.now() / 1000);
const claim = `${b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64u(
  JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  })
)}`;

const signer = createSign('RSA-SHA256');
signer.update(claim);
const assertion = `${claim}.${signer
  .sign(account.private_key, 'base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')}`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
const { access_token: token } = await tokenRes.json();
if (!token) {
  console.error('\n  ✕ Google rejected the service account\n');
  process.exit(1);
}

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function listAll(collection) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${base}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data = await (await fetch(url, { headers: H })).json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// --- survey before touching anything ---------------------------------------

console.log('\n  წასაშლელი:\n');
const plan = {};
let total = 0;
const orphanKeys = [];

for (const collection of WIPE) {
  const docs = await listAll(collection);
  plan[collection] = docs;
  total += docs.length;
  if (docs.length) console.log(`    ${String(docs.length).padStart(4)}  ${collection}`);

  if (collection === 'albumMedia') {
    docs.forEach((d) => {
      const key = d.fields?.objectKey?.stringValue;
      if (key) orphanKeys.push(key);
    });
  }
}

if (total === 0) {
  console.log('    (ცარიელია — წასაშლელი არაფერია)\n');
  process.exit(0);
}

console.log(`\n  შენარჩუნდება: ${KEEP.join(', ')}\n`);

if (!flags.includes('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`  ${total} ჩანაწერი სამუდამოდ წაიშლება. დაწერეთ "delete" გასაგრძელებლად: `);
  rl.close();
  if (answer.trim() !== 'delete') {
    console.log('\n  გაუქმდა — არაფერი წაშლილა.\n');
    process.exit(0);
  }
}

// --- delete ----------------------------------------------------------------

let deleted = 0;
for (const [collection, docs] of Object.entries(plan)) {
  for (const doc of docs) {
    const res = await fetch(`https://firestore.googleapis.com/v1/${doc.name}`, {
      method: 'DELETE',
      headers: H,
    });
    if (res.ok) deleted++;
  }
  if (docs.length) console.log(`  ✓ ${collection}`);
}

console.log(`\n  ✓ ${deleted} ჩანაწერი წაიშალა\n`);

if (orphanKeys.length) {
  console.log(`  ⚠ R2-ში დარჩა ${orphanKeys.length} ფაილი — საცავის გასაღებები მხოლოდ Worker-ს აქვს.`);
  console.log('    წასაშლელად:\n');
  orphanKeys.forEach((key) => {
    console.log(`      npx wrangler r2 object delete "guestbook-media/${key}"`);
  });
  console.log('');
}
