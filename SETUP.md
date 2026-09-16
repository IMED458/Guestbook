# დაყენება

ეს დოკუმენტი ზუსტ ნაბიჯებს აღწერს. თითოეული ბლოკი თავისი თანმიმდევრობითაა —
გამოტოვება არ შეიძლება, რადგან ერთი მეორის გამოსავალს იყენებს.

---

## 1. Cloudflare — R2 და Worker

### 1.1 შესვლა

```bash
cd workers/api
npx wrangler login
```

ბრაუზერი გაიხსნება; დაადასტურე წვდომა. შემდეგ გადაამოწმე:

```bash
npx wrangler whoami
```

### 1.2 R2-ის ჩართვა

R2 ბარათის მიბმას ითხოვს, მაგრამ **10 GB საცავი, 1 მლნ ჩაწერა და 10 მლნ
წაკითხვა თვეში უფასოა**.

დაშბორდი → **R2 Object Storage** → *Purchase R2* / *Enable*.

### 1.3 Bucket

```bash
npx wrangler r2 bucket create guestbook-media
```

Bucket **პრივატული რჩება**. საჯარო წვდომას არ ვრთავთ — ყველა ფაილი
ხელმოწერილი, დროებითი ბმულით მიეწოდება.

### 1.4 CORS

ბრაუზერი პირდაპირ R2-ს წერს, ამიტომ bucket-მა ჩვენი origin უნდა დაუშვას:

```bash
npx wrangler r2 bucket cors set guestbook-media --file ./r2-cors.json
```

გადამოწმება:

```bash
npx wrangler r2 bucket cors list guestbook-media
```

> R2 API `{ "rules": [...] }` ფორმას ითხოვს — არა S3-ის ბრტყელ მასივს.
> [`r2-cors.json`](workers/api/r2-cors.json) სწორ ფორმაშია.

> `ExposeHeaders: ["ETag"]` **აუცილებელია**. multipart ატვირთვის დასრულებას
> თითოეული ნაწილის ETag სჭირდება; მის გარეშე დიდი ვიდეო ბოლო ნაბიჯზე ჩავარდება.

### 1.5 R2 API token

დაშბორდი → R2 → **API** → *Manage API Tokens* → **Create API Token**

- Permission: **Object Read & Write**
- Scope: მხოლოდ `guestbook-media`

დაიმახსოვრე სამი მნიშვნელობა — **Secret Access Key მხოლოდ ერთხელ ჩანს**:

| | სად გამოიყენება |
|---|---|
| Account ID | `R2_ACCOUNT_ID` |
| Access Key ID | `R2_ACCESS_KEY_ID` |
| Secret Access Key | `R2_SECRET_ACCESS_KEY` |

### 1.6 KV namespace (rate limiting)

```bash
npx wrangler kv namespace create RATE_LIMIT
```

დააბრუნებს `id`-ს — ჩასვი [`workers/api/wrangler.jsonc`](workers/api/wrangler.jsonc)-ში.

> ამ პროექტში უკვე შექმნილია და კონფიგშია ჩასმული.

### 1.7 Secrets

**არასოდეს** ჩაწერო ეს მნიშვნელობები ფაილში, რომელსაც Git ხედავს.
`wrangler secret put` პაროლს ინტერაქტიულად ითხოვს:

```bash
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Firebase service account (იხ. ნაწილი 2.4) — ფაილიდან:

```bash
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT < ./service-account.json
```

### 1.8 Deploy

```bash
npx wrangler deploy
```

დაბრუნებულ URL-ს (`https://guestbook-api.<subdomain>.workers.dev`) ჩასვამ
frontend-ის `.env`-ში, `VITE_API_BASE_URL`-ად.

გადამოწმება:

```bash
curl https://guestbook-api.<subdomain>.workers.dev/api/health
```

ლოგები რეალურ დროში:

```bash
npx wrangler tail
```

---

## 2. Firebase

### 2.1 Authentication

Console → **Authentication** → *Sign-in method* → **Email/Password** → Enable.

მომხმარებელი username-ს კრეფს; Firebase შიგნით `username@users.guestbook.local`
იდენტობას იყენებს. ეს მისამართი UI-ში არასოდეს ჩანს და წერილს არ იღებს.

### 2.2 Authorized domains

Authentication → Settings → **Authorized domains** — დაამატე `localhost` და
`imed458.github.io`.

### 2.3 Firestore rules

```bash
npx firebase-tools deploy --only firestore:rules --project guestbook-40634
```

ან Console → Firestore → Rules → ჩასვი [`firestore.rules`](firestore.rules) → Publish.

### 2.4 Service account

Console → **Project settings** → *Service accounts* → **Generate new private key**.

ჩამოტვირთული JSON:

- **არასოდეს** commit-დეს (`.gitignore` უკვე ფარავს `*service-account*.json`);
- მხოლოდ Worker-ის secret-ში და პირველი ადმინის შესაქმნელად გამოიყენება.

### 2.5 პირველი Super Admin

კოდში ნაგულისხმევი ანგარიში **არ არსებობს** — პროგნოზირებადი `admin/admin`
production-ზე უკარებელი კარია. პირველ მფლობელს შენ ქმნი:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
npm run create-super-admin -- \
  --username imedo \
  --password 'აქ ძლიერი პაროლი' \
  --firstName გიორგი \
  --lastName იმედაშვილი \
  --email you@example.com
```

პაროლი არსად არ ინახება და არ ილოგება. შემდეგ შედი `#/login`-ზე username-ით.

---

## 3. EmailJS

1. დარეგისტრირდი: https://www.emailjs.com
2. **Email Services** → დაამატე სერვისი (Gmail ან SMTP) → აიღე **Service ID**
3. **Account** → **General** → აიღე **Public Key**
4. **Email Templates** → შექმენი თითო თარგი და აიღე **Template ID**:

| თარგი | ცვლადები |
|---|---|
| შეკვეთა მზადაა | `client_name`, `order_number`, `balance` |
| კურიერს გადაეცა | `client_name`, `order_number`, `courier_info` |
| სტუმრების წიგნი მზადაა | `client_name`, `guestbook_url`, `username` |
| ციფრული ალბომი მზადაა | `client_name`, `album_url` |
| ანგარიში მზადაა | `username`, `temporary_password` |
| გადახდის შეხსენება | `client_name`, `order_number`, `balance` |

5. **Account** → **Security** → *Allowed origins*: `http://localhost:3000` და
   `https://imed458.github.io`

> EmailJS-ის public key ბრაუზერისთვისაა განკუთვნილი — ის საიდუმლო არ არის.
> Allowed origins არის ის, რაც მას სხვისგან იცავს, ამიტომ მისი შევსება
> აუცილებელია.

---

## 4. Frontend

```bash
cp .env.example .env
```

შეავსე:

```
VITE_API_BASE_URL=https://guestbook-api.<subdomain>.workers.dev
VITE_AUTH_EMAIL_DOMAIN=users.guestbook.local
VITE_EMAILJS_PUBLIC_KEY=...
VITE_EMAILJS_SERVICE_ID=...
VITE_APP_URL=https://imed458.github.io/Guestbook/
```

> `VITE_AUTH_EMAIL_DOMAIN` **ზუსტად უნდა ემთხვეოდეს** `wrangler.jsonc`-ის
> `AUTH_EMAIL_DOMAIN`-ს. სხვაობა ნიშნავს, რომ Worker ერთ იდენტობას შექმნის,
> ხოლო login მეორეს მოძებნის.

```bash
npm install
npm run dev
```

---

## 5. GitHub Pages

Settings → Pages → Source: **GitHub Actions**.

Worker-ის URL და EmailJS-ის იდენტიფიკატორები დაამატე repository-ის
**Settings → Secrets and variables → Actions → Variables** ბლოკში, იმავე
სახელებით, რაც `.github/workflows/deploy.yml`-შია.

---

## შემოწმების სია

- [ ] `npx wrangler whoami` — ანგარიში ჩანს
- [ ] `npx wrangler r2 bucket list` — `guestbook-media` ჩანს
- [ ] R2 CORS შენახულია და `ExposeHeaders`-ში `ETag` წერია
- [ ] `npx wrangler secret list` — ოთხივე secret ჩამოთვლილია
- [ ] `curl .../api/health` — `{"status":"ok"}`
- [ ] Firebase Email/Password ჩართულია
- [ ] Firestore rules გამოქვეყნებულია
- [ ] `npm run create-super-admin` წარმატებით გაირა
- [ ] `.env` შევსებულია და `VITE_API_BASE_URL` მიუთითებს Worker-ზე
