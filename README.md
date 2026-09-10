# Digital Guest Book

A guest book for weddings, birthdays and events: guests scan a QR code, leave a
message with a photo or a video, and the host moderates everything from a
dashboard.

Pure static frontend — **React + Vite + Tailwind**, with:

| Concern | Where it lives |
| --- | --- |
| Text data (guest books, messages, reactions, analytics) | **Firebase Firestore** |
| Photos and videos | **Cloudinary** (unsigned browser uploads) |
| Accounts / sessions | **Firebase Auth** (email + password) |
| Hosting | **GitHub Pages** via `.github/workflows/deploy.yml` |

There is no backend server: `src/lib/api.ts` talks to Firestore directly, and
Firestore security rules (`firestore.rules`) enforce who may read and write what.

---

## One-time setup

### 1. Firebase

In the [Firebase console](https://console.firebase.google.com/) for project
`guestbook-40634`:

1. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
2. **Authentication → Settings → Authorized domains** — add `localhost` and
   `<your-github-username>.github.io`.
3. **Build → Firestore Database → Create database** (production mode, any region).
4. **Firestore → Rules** — paste the contents of [`firestore.rules`](firestore.rules)
   and publish. Or, with the Firebase CLI:

   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

No composite indexes are needed: every query uses equality filters only, and
sorting happens in the browser.

### 2. Cloudinary

In the [Cloudinary console](https://console.cloudinary.com/) → **Settings →
Upload → Upload presets**:

- Set the preset named `ml_default` to **Signing Mode: Unsigned**, or create a
  new unsigned preset and put its name in `VITE_CLOUDINARY_UPLOAD_PRESET`.

Only the cloud name and the unsigned preset name are ever shipped to the
browser. **The Cloudinary API secret must never appear in this repository.**

### 3. GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.** Every push
to `main` then builds and publishes automatically.

---

## Local development

```bash
npm install
npm run dev
```

The Firebase and Cloudinary values in `src/lib/firebase.ts` and
`src/lib/cloudinary.ts` are used by default, so the app runs with no `.env`.
To point it at a different project, copy `.env.example` to `.env` and fill it in.

```bash
npm run lint     # tsc --noEmit
npm run build    # production bundle into dist/
npm run preview  # serve the built bundle
```

## Routing

Routes are hash-based so that any deep link is still a request for the single
`index.html` a static host serves:

- `#/` — landing page
- `#/g/<slug>` — a public guest book
- `#/dashboard` — the host dashboard

## Data model

```
guestbooks/{bookId}                      public read, owner write
guestbooks/{bookId}/reactors/{visitorId} one doc per visitor: their emoji reactions
messages/{messageId}                     approved messages are public, owner sees all
messageEmails/{messageId}                guest emails — write-only for guests, owner-only to read
```

Media lives in Cloudinary; Firestore stores only the resulting URLs.

---

## Compliance and accessibility

| Area | Where it lives |
| --- | --- |
| Operator identity used by every legal page and the footer | [`src/lib/site-config.ts`](src/lib/site-config.ts) — **placeholders, fill these in** |
| Privacy, Terms, Refund, and Cookie policies (Georgian + English) | [`src/content/legal.ts`](src/content/legal.ts), rendered by `LegalPage` at `#/legal/<slug>` |
| Cookie / storage consent, and what each category covers | [`src/lib/consent.ts`](src/lib/consent.ts), banner in `CookieBanner` |
| Image licensing | [`IMAGE-CREDITS.md`](IMAGE-CREDITS.md) |
| Keyboard and screen-reader behaviour for dialogs | [`src/lib/useModalA11y.ts`](src/lib/useModalA11y.ts) |

### Tracking

There is no analytics product on this site — no Google Analytics, no ad network,
no social pixel. The only measurement is a per-day page-view counter written to
the guest book's own Firestore document, and it does not run until the visitor
opts in through the banner. Typefaces are self-hosted (`src/fonts/`), so opening
a page discloses the visitor's IP address to no third party.

### Before going live

1. Fill in every `[PLACEHOLDER]` in `src/lib/site-config.ts`. Until you do, each
   legal page shows a visible warning that it is still a template.
2. Have a lawyer in your jurisdiction read the four policies. They are drafted
   against Georgian and EU consumer/data-protection practice, but they are a
   starting point, not legal advice.
3. Update the Refund Policy when paid plans actually launch.
