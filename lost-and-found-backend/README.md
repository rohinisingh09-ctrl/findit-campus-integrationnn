# Campus Lost & Found — Backend (Node.js)

## Setup

1. Use Node.js 22.13+ (Node.js 24 LTS recommended), then run `npm ci`.
2. Copy `.env.example` to `.env` and fill in real values:
   - `MONGO_URI` — from your teammate (MongoDB Atlas connection string)
   - `COLLEGE_EMAIL_DOMAIN` — e.g. `@sru.edu.in`
   - `ADMIN_EMAIL` — the one email allowed to see every report (room 8001 coordinator)
   - `SMTP_USER` / `SMTP_PASS` — an email account to send OTPs from (Gmail App Password works)
3. `npm run dev` (or `npm start`), then open `http://localhost:5000`. The backend serves the frontend and `/api` together.
4. Set `JWT_SECRET` to a random secret of at least 32 characters. For production, put the app behind HTTPS.

## Flow

1. User enters their college email → `POST /api/auth/send-otp` → OTP emailed to them.
2. User enters the OTP → `POST /api/auth/verify-otp` → gets a JWT token.
3. Token is sent as `Authorization: Bearer <token>` on every request after that.
4. Logged-in user reports an item (lost or found) → `POST /api/items`.
5. Found items are recorded as handed in to **room 8001** (`roomNumber` field).
6. Only `ADMIN_EMAIL` can call `GET /api/items` to see every report — owners see their private report details via `GET /api/items/mine`, while public search and item details expose only the public field allowlist.

## API Reference

### `POST /api/auth/send-otp`
Body: `{ "email": "name@sru.edu.in" }`
Sends a 6-digit OTP to the college email. Rejects non-college emails.

### `POST /api/auth/verify-otp`
Body: `{ "email": "name@sru.edu.in", "otp": "123456" }`
Response: `{ "message": "Login successful", "token": "<jwt>" }`

### `POST /api/items` (auth required)
Headers: `Authorization: Bearer <token>`
Body:
```json
{
  "type": "lost",          // or "found"
  "itemName": "Blue backpack",
  "description": "Navy blue, has a laptop inside",
  "category": "Bag",
  "location": "Library 2nd floor",
  "contactNumber": "9876543210"
}
```

### `GET /api/items/mine` (auth required)
Returns only the reports submitted by the logged-in user.

### `GET /api/items` (auth + admin only)
Returns every report in the system. Only works if the logged-in user's email matches `ADMIN_EMAIL`.

## Notes for your teammate (MongoDB)

- Two collections: `users` (email + OTP state) and `items` (lost/found reports).
- Mongoose schemas are in `models/User.js` and `models/Item.js` — they just need a valid `MONGO_URI` in `.env`, no other setup on this side.

## Why these choices (for your report/viva)

- **OTP over passwords**: no password storage/reset flow to build; college email + OTP proves the reporter is a real student without extra infrastructure.
- **JWT over sessions**: stateless — no session store needed, fits a simple REST API.
- **Single ADMIN_EMAIL gate over role field**: the requirement was "one particular person," so a config value is simpler than building a full roles/permissions system.


## Security and deployment update ? 2026-10-14

- Public `GET /api/items/search` and `GET /api/items/:id` return only public item fields, excluding email and phone. Smart matches also omit the other reporter's contact details. Owners retain contact details in `/mine`; the configured admin retains access through `GET /api/items`. Public descriptions remain visible: do not enter private contact information in descriptions.
- OTPs use cryptographic randomness. Each account has a MongoDB-backed 60-second resend cooldown and a maximum of five verification attempts per code. Verification atomically consumes the code. IP limits are 10 send requests and 30 verification requests per 15 minutes.
- IP counters are in memory for a single server process. Multiple instances need a shared limiter store. Behind a reverse proxy, configure Express trust proxy for the exact trusted topology before launch; otherwise clients may share the proxy IP's quota. Never blindly trust all forwarded IP headers.
- `findit-campus-frontend/config.js` defaults to `/api`. For separate hosting, set its API URL and set `CORS_ORIGINS` to the exact frontend origins (comma-separated). Do not open the HTML directly using `file://`.
- `npm run dev` uses Node's built-in watcher instead of nodemon. Express and Nodemailer were upgraded across major versions; regression tests cover HTTP routes, but real SMTP and MongoDB smoke tests are still required before release.
- Run `npm test` and `npm audit` from this directory. Tests use an in-memory model substitute (not MongoDB), mocked SMTP, an ephemeral HTTP server, and jsdom for DOM regression checks. They do not contact the configured database or send mail.
- The return/claim workflow is still pending; the `resolved` field does not yet have an application update endpoint.
