#!/usr/bin/env node
/**
 * Bootstrap the first super administrator.
 *
 * There is deliberately no default account in the source. A predictable
 * admin/admin on a production deployment is a back door, so the first owner
 * is created here, once, by someone holding the service-account key.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node scripts/create-super-admin.mjs --username imedo --password 'a strong one'
 *
 * The service-account file must never be committed; .gitignore already covers
 * *service-account*.json.
 */

import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    username: { type: 'string' },
    password: { type: 'string' },
    firstName: { type: 'string', default: 'System' },
    lastName: { type: 'string', default: 'Administrator' },
    email: { type: 'string' },
    domain: { type: 'string' },
    credentials: { type: 'string' },
  },
});

function fail(message) {
  console.error(`\n  ✕ ${message}\n`);
  process.exit(1);
}

const username = (values.username || '').trim().toLowerCase().replace(/\s+/g, '');
const password = values.password || '';

if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) {
  fail('--username must start with a letter and use only a-z, 0-9, dot, dash or underscore (3-32 chars)');
}
if (password.length < 10) {
  fail('--password must be at least 10 characters for the owner of the system');
}

const credentialsPath = values.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  fail('set GOOGLE_APPLICATION_CREDENTIALS, or pass --credentials ./service-account.json');
}

const account = JSON.parse(await readFile(credentialsPath, 'utf8'));
const projectId = account.project_id;
const authDomain = values.domain || process.env.AUTH_EMAIL_DOMAIN || 'users.guestbook.local';
const authEmail = `${username}@${authDomain}`;

/* --- mint an access token from the service account --- */

const base64Url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const now = Math.floor(Date.now() / 1000);
const assertionBody = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(
  JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
)}`;

const signer = createSign('RSA-SHA256');
signer.update(assertionBody);
const assertion = `${assertionBody}.${signer
  .sign(account.private_key.replace(/\\n/g, '\n'), 'base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')}`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }),
});

if (!tokenRes.ok) fail(`Google rejected the service account: ${await tokenRes.text()}`);
const { access_token: accessToken } = await tokenRes.json();

const authed = (extra = {}) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  ...extra,
});

/* --- refuse to run twice --- */

const claimUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usernames/${username}`;
const existing = await fetch(claimUrl, { headers: authed() });
if (existing.ok) {
  fail(`the username "${username}" is already taken`);
}

/* --- create the auth user --- */

const createRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`,
  {
    method: 'POST',
    headers: authed(),
    body: JSON.stringify({
      email: authEmail,
      password,
      displayName: `${values.firstName} ${values.lastName}`.trim(),
    }),
  }
);

if (!createRes.ok) fail(`could not create the account: ${await createRes.text()}`);
const { localId: uid } = await createRes.json();

/* --- the claim is what firestore.rules and the Worker trust --- */

const claimRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
  {
    method: 'POST',
    headers: authed(),
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify({ role: 'SUPER_ADMIN' }),
    }),
  }
);
if (!claimRes.ok) fail(`could not set the role claim: ${await claimRes.text()}`);

/* --- profile and username reservation --- */

const stringValue = (v) => ({ stringValue: v });
const timestamp = new Date().toISOString();

const profileRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${uid}`,
  {
    method: 'POST',
    headers: authed(),
    body: JSON.stringify({
      fields: {
        username: stringValue(username),
        authEmail: stringValue(authEmail),
        firstName: stringValue(values.firstName),
        lastName: stringValue(values.lastName),
        contactEmail: values.email ? stringValue(values.email) : { nullValue: null },
        role: stringValue('SUPER_ADMIN'),
        permissions: { arrayValue: { values: [] } },
        clientId: { nullValue: null },
        access: {
          mapValue: {
            fields: {
              guestbook: { booleanValue: true },
              album: { booleanValue: true },
              orders: { booleanValue: true },
              payments: { booleanValue: true },
            },
          },
        },
        status: stringValue('ACTIVE'),
        mustChangePassword: { booleanValue: false },
        createdAt: stringValue(timestamp),
        updatedAt: stringValue(timestamp),
      },
    }),
  }
);
if (!profileRes.ok) fail(`could not write the profile: ${await profileRes.text()}`);

const reserveRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usernames?documentId=${username}`,
  {
    method: 'POST',
    headers: authed(),
    body: JSON.stringify({
      fields: { uid: stringValue(uid), createdAt: stringValue(timestamp) },
    }),
  }
);
if (!reserveRes.ok) fail(`could not reserve the username: ${await reserveRes.text()}`);

console.log(`
  ✓ Super administrator created

    მომხმარებელი: ${username}
    uid:          ${uid}
    auth identity: ${authEmail}   (internal — never shown in the UI)

  Sign in at #/login with the username and the password you passed.
  The password was not stored or logged anywhere.
`);
