# FindIt@Campus — Detailed Learning Guide

A beginner-friendly explanation of the project, its technologies and the ideas behind the code.

The short guide is in `PROJECT-STUDY-GUIDE.md`. Use this version to understand the concepts, then use the short guide for revision. Examples below are simplified teaching examples unless described as actual project behavior. Do not copy them over the application files.

## 1. What problem does the project solve?

Imagine you lose a blue bag in the campus library. Another student finds it but does not know whose bag it is. Without a shared system, you may both rely on messages or notice boards.

FindIt@Campus gives both students one place to report the item. You submit a **lost** report; the other student submits a **found** report. The system compares the reports and suggests possible matches.

The implemented features are:

- College-email OTP login.
- Lost-item and found-item report forms.
- Public search with filters.
- A page showing your own reports.
- A dashboard with counts and suggested matches.
- Restricted access to private contact fields.

A match is a suggestion to investigate. It does not prove ownership. A complete claim, ownership-check and return-confirmation workflow is not implemented yet.

**How to introduce it:** “Our project helps students report and locate lost belongings through a central website. It verifies access to college email and uses a rule-based matching algorithm to suggest related lost and found reports.”

## 2. Understand the three main parts

| Part | Simple meaning | Example in this project |
| --- | --- | --- |
| Frontend | The interface the user sees and interacts with in the browser. | A form asking for item name, description and location. |
| Backend | Server code that checks requests and performs operations. | Checking login before accepting a report. |
| Database | Persistent storage that keeps information between requests and server restarts. | Saved users and reports in MongoDB. |

Think of a college office: the frontend is the counter, the backend is the staff processing requests, and the database is the record system.

A normal request travels through these steps:

1. The browser collects form values.
2. JavaScript sends an HTTP request to the backend.
3. The backend checks access and processes the request.
4. Mongoose reads or writes MongoDB records.
5. The backend returns a response.
6. JavaScript updates the page.

The database is not accessed directly from the browser. This keeps database credentials and access checks on the server.

## 3. Which technologies are actually frameworks?

These names belong to different categories. Being able to explain the difference is useful in an evaluation.

| Name | Category | Main role |
| --- | --- | --- |
| HTML | Markup language | Page structure. |
| CSS | Style-sheet language | Page appearance and layout. |
| JavaScript | Programming language | Browser and server logic. |
| Node.js | JavaScript runtime | Runs JavaScript outside the browser. |
| Express | Backend web framework | Organizes HTTP routes and request handling. |
| MongoDB | Database | Stores documents. |
| Mongoose | Object-document mapping library | Connects JavaScript models to MongoDB documents. |
| Nodemailer | Email library | Sends messages through an email transport. |
| jsonwebtoken | Library | Creates and verifies JWTs. |
| bcryptjs | Hashing library | Hashes and checks OTP values. |
| dotenv | Configuration library | Loads local environment settings. |
| cors | Express middleware package | Sets cross-origin response headers. |
| express-rate-limit | Express middleware package | Restricts repeated requests. |
| jsdom | Testing library | Simulates a browser document for tests. |
| npm | Package manager | Installs dependencies and runs project commands. |

This project does not use React, Angular, Vue, Next.js, Bootstrap or Tailwind. Its frontend uses plain HTML, CSS and JavaScript.

## 4. Frontend concepts with examples

### HTML: the structure

HTML uses elements such as headings, labels, inputs, buttons and forms.

```html
<form id="lostItemForm">
  <label for="itemName">Item name</label>
  <input id="itemName" type="text" required>
  <button type="submit">Submit report</button>
</form>
```

- `form` groups the fields and submit action.
- `id` gives an element a unique identifier that JavaScript can find.
- `label for="itemName"` connects the label to its input.
- `required` asks the browser to reject an empty field before submission.

Browser checks improve usability, but the backend must also validate input. Someone can call the API without using the webpage.

**Where to look:** `report-lost.html`, `report-found.html` and `login.html`.

### CSS: appearance and responsive layouts

CSS applies rules to matching HTML elements.

```css
.item-card {
  background: white;
  padding: 22px;
  border-radius: 12px;
}
```

A class selector starts with a dot. This rule styles elements with `class="item-card"`.

The **box model** describes an element's content, padding, border and margin. Padding is space inside the border; margin is space outside it.

The project uses both layout systems below:

- **Flexbox:** arranges elements along a main direction, such as navigation links or buttons.
- **Grid:** arranges content in rows and columns, such as item cards.

```css
.search-results {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 500px) {
  .search-results {
    grid-template-columns: 1fr;
  }
}
```

This shows three equal columns on wider screens and one on small screens. A **media query** applies styles when a condition, such as screen width, is met. This is part of responsive design.

**Where to look:** `style.css`. Responsive rules exist, but real-device layout verification is still needed.

### JavaScript: interaction and page updates

JavaScript reacts to user actions and communicates with the backend.

```js
const form = document.getElementById("lostItemForm");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const itemName = document.getElementById("itemName").value.trim();
  // Send the report to the backend here.
});
```

The **DOM**, or Document Object Model, is the browser's representation of the page. JavaScript uses it to read inputs, add results and show messages.

An **event listener** is a function that runs when an event occurs. Here, it responds to form submission. `preventDefault()` stops the browser's normal form navigation so the script can handle the request.

`trim()` removes spaces from the beginning and end of a string.

**Where to look:** `script.js`, which is shared by every page. It checks whether a page's elements exist before attaching page-specific behavior.

### Fetch, JSON, promises and async/await

The browser's `fetch()` function sends an HTTP request.

```js
const response = await fetch("/api/items/search?q=bag");
const data = await response.json();
console.log(data.items);
```

A **promise** represents a result that will become available later. `await` pauses that async function until the promise settles; it does not freeze the whole browser.

**JSON** is a text format used to exchange structured data:

```json
{
  "type": "lost",
  "itemName": "Blue bag",
  "description": "A blue backpack with a white zip",
  "category": "Bag",
  "location": "Library"
}
```

A JavaScript object exists in program memory. `JSON.stringify()` converts it into JSON text for a request. Parsing JSON converts the text back into data.

The project's `apiRequest()` helper adds headers, attaches the login token, reads JSON and checks for error responses. This avoids duplicating those steps in every form.

### localStorage and login state

`localStorage` stores strings in the browser for a website. The project stores `token` and `userEmail` there so navigation and later requests can recognize the login session.

```js
localStorage.setItem("token", token);
const savedToken = localStorage.getItem("token");
```

Storage is not proof of authorization. The server must verify the token on each protected request. Since page scripts can read localStorage, preventing script injection is particularly important.

## 5. Backend technologies with examples

### Node.js: running JavaScript on the server

Node.js runs files such as `server.js`. Unlike browser JavaScript, it can use server facilities such as filesystem access, environment settings and network listeners.

The project uses **CommonJS modules**:

```js
const Item = require("../models/Item");
module.exports = { reportItem };
```

`require()` imports another module. `module.exports` makes values available to other files. Splitting code into modules makes each file easier to understand.

Node is the runtime; Express is a framework running inside it.

### Express: routes, requests and responses

Express maps an HTTP method and path to a handler.

```js
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
```

- `req` contains information sent by the client.
- `res` is used to send the response.
- `GET` retrieves information.
- `POST` submits information, such as a new report.

A **route** is an API entry point. A **controller** is the function that performs the operation behind that route.

```js
router.post("/", requireAuth, asyncHandler(reportItem));
```

In `itemRoutes.js`, this router is mounted under `/api/items`. The final address is therefore `POST /api/items`.

### Middleware: checks along the request path

Middleware runs between receiving the request and producing the final response.

```js
function requireAuth(req, res, next) {
  // Check the token.
  // Reject an invalid request, or call next() to continue.
}
```

`next()` passes control to the following handler. Sending a response and returning stops the request from reaching the controller.

In this project:

- `auth.js` verifies login tokens.
- `admin.js` checks the configured administrator email.
- `authLimits.js` restricts OTP requests.
- `express.json()` parses JSON request bodies into `req.body`.

**Authentication** asks “Who are you?” **Authorization** asks “What are you allowed to do?” A student can be authenticated but still forbidden from the admin endpoint.

### MongoDB: storing documents

MongoDB stores documents inside collections. A collection is roughly comparable to a table, and a document to one record, although the storage model differs from a relational database.

An item document may look like this:

```js
{
  _id: ObjectId("..."),
  type: "lost",
  itemName: "Blue bag",
  reporterEmail: "student@sru.edu.in",
  status: "pending"
}
```

`_id` identifies the document. MongoDB stores BSON, a document format that supports types such as ObjectId and dates; API responses are serialized to JSON.

The two main collections are `users` and `items`. Items refer to reporters using `reporterEmail`, rather than a separate user-ID relationship.

### Mongoose: schemas, models and queries

Mongoose provides a structured way to use MongoDB from JavaScript.

A **schema** defines fields and rules:

```js
const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["pending", "resolved"],
    default: "pending"
  }
});
```

`required` demands a value. `enum` restricts allowed values. `default` supplies a value when omitted. `trim` removes outer whitespace.

A **model** provides methods for a collection:

```js
const Item = mongoose.model("Item", itemSchema);
await Item.create({ /* report fields */ });
const reports = await Item.find({ reporterEmail: req.user.email });
```

The project uses `timestamps: true`, which adds `createdAt` and `updatedAt`. The matching algorithm compares `createdAt` dates.

A **projection** selects which fields a query returns. Public routes select approved fields so they do not return private contact information. Mongoose schemas are helpful, but explicit request validation is still needed; that remains an improvement area.

### Nodemailer and SMTP: delivering email

Nodemailer is the library that builds and sends an email. **SMTP** is the protocol used to transfer email to a configured mail server.

```js
await transporter.sendMail({
  to: email,
  subject: "Your login OTP",
  text: `Your OTP is ${otp}`
});
```

The transporter is configured using SMTP host, port and credentials. Nodemailer itself is not an email inbox or email provider. Real delivery depends on the configured provider and network access.

**Where to look:** `utils/mailer.js`. The automated tests substitute email delivery; they do not send real messages.

### bcryptjs: hashing the OTP

Hashing transforms an input into a representation used for comparison. It is different from encryption: the application does not decrypt the stored hash to recover the OTP.

```js
const storedHash = await bcrypt.hash(otp, 10);
const correct = await bcrypt.compare(submittedOtp, storedHash);
```

bcrypt includes a salt, so hashing the same code again can produce a different stored value. The `10` is a work-factor setting, not the OTP length.

OTPs have a small set of possible values. Hashing alone is not enough; expiry and attempt limits also matter.

The project generates the six-digit OTP using Node's built-in cryptographic `randomInt()`, rather than `Math.random()`.

### JWT and jsonwebtoken: proving login on later requests

After successful OTP verification, the server signs a **JSON Web Token** containing the user's email and an expiry.

```js
const token = jwt.sign(
  { email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
```

Later the browser sends:

```text
Authorization: Bearer <token>
```

The server runs `jwt.verify()` to check the signature and expiry. A signed token allows the server to detect changes to its contents.

JWT payloads are not encrypted by default. Do not put passwords or OTPs in them. Anyone holding a valid bearer token can use it, so HTTPS and safe browser rendering matter.

Logging out deletes the browser's stored token. This project does not maintain a server-side revocation list, so a copied token can remain valid until expiry.

### dotenv: configuration without hardcoding secrets

`require("dotenv").config()` loads settings from a local `.env` file into `process.env`.

```js
const port = process.env.PORT || 5000;
```

Settings include `MONGO_URI`, `JWT_SECRET`, SMTP credentials, college domain and admin email. `.env.example` shows which settings are needed without supplying real credentials.

Frontend `config.js` is different: it is public and only sets the API address. Secret values must never be placed in it.

### cors: cross-origin browser access

An **origin** is the combination of protocol, host and port. `http://localhost:5000` and `http://localhost:5500` are different origins.

CORS response headers tell browsers whether another origin may read the response. The project accepts configured frontend origins through `CORS_ORIGINS`; the default setup serves frontend and API together.

CORS is not authentication and does not prevent non-browser clients from calling an API. JWT and admin checks still enforce access.

### express-rate-limit: slowing repeated requests

This middleware limits authentication requests per IP address:

- Up to 10 OTP-send requests per 15 minutes.
- Up to 30 OTP-verification requests per 15 minutes.

An exceeded limit returns HTTP `429`. These IP counters are held in server-process memory. Account cooldowns and attempt counts are stored separately in MongoDB.

Multiple backend instances would need shared IP counters. Reverse-proxy configuration also matters so the application identifies client addresses correctly.

### npm and dependency files

A **dependency** is an external package the project uses. `package.json` declares packages and commands. `package-lock.json` records exact installed dependency versions, including packages those packages require.

```powershell
npm ci          # Install from the lockfile
npm start       # Run the server
npm run dev     # Run with Node's file watcher
npm test        # Run the regression suite
npm audit       # Check reported dependency vulnerabilities
```

`node_modules` contains installed packages. You generally study the application's code instead of editing those files. jsdom is a development dependency because it supports tests rather than normal server operation.

## 6. Folder map: knowing where to look

Paths in the next two tables are relative to their respective frontend/backend folders.

### `findit-campus-frontend/`

| File | Responsibility |
| --- | --- |
| `index.html` | Home page and links to the main actions. |
| `login.html` | Email and OTP inputs. |
| `report-lost.html` | Lost-item form. |
| `report-found.html` | Found-item form and hand-in room. |
| `search.html` | Search input, filters, result container and details dialog. |
| `my-reports.html` | Own-report list and details dialog. |
| `dashboard.html` | Counts, quick actions and match cards. |
| `style.css` | Shared appearance and responsive rules. |
| `script.js` | API helper, login storage, form events, rendering and dialogs. |
| `config.js` | Public API base address; `/api` by default. |
| `package-lock.json` | Existing frontend lockfile; active application npm commands are in the backend. |

### `lost-and-found-backend/`

| File | Responsibility |
| --- | --- |
| `server.js` | Starts the app, registers middleware/routes, serves frontend files and handles errors. |
| `config/db.js` | Connects to MongoDB before the server starts listening. |
| `routes/authRoutes.js` | OTP endpoint paths and rate-limit middleware. |
| `routes/itemRoutes.js` | Item endpoint paths and access checks. |
| `controllers/authController.js` | Email validation, OTP issue/verification and JWT creation. |
| `controllers/itemController.js` | Report creation, search, personal items and dashboard data. |
| `models/User.js` | Email, OTP hash/expiry/attempts, last-send time and verification flag. |
| `models/Item.js` | Item details, reporter contact fields and report status. |
| `middleware/auth.js` | JWT verification. |
| `middleware/admin.js` | Configured-admin authorization. |
| `middleware/authLimits.js` | IP-based authentication limits. |
| `utils/otp.js` | Secure code generation and bcrypt operations. |
| `utils/mailer.js` | SMTP email delivery. |
| `utils/matchService.js` | Text comparison, weighted scores and sorted match results. |
| `utils/publicItem.js` | Public field allowlist and response shaping. |
| `utils/asyncHandler.js` | Forwards rejected async operations to Express error handling. |
| `test/security.test.js` | Authentication, privacy and frontend rendering regression tests. |
| `package.json` / `package-lock.json` | Commands and dependency declarations / exact versions. |
| `.env` / `.env.example` | Local configuration / configuration template. |
| `README.md` | Setup and API/security notes. |
| `node_modules/` | Generated installed dependencies. |

At the repository root, `AUDIT-REPORT.md` tracks fixes and remaining work, while the study guides explain the project. `.git/` holds Git metadata; `.gitignore` files are used to define ignore patterns.

## 7. Trace the important features step by step

### Login and OTP safety

1. The student submits one valid college email address.
2. The backend checks the exact configured domain.
3. It generates a random code and stores its hash with an expiry.
4. It reserves a 60-second resend cooldown for that account.
5. Nodemailer sends the code.
6. The student submits six digits.
7. The backend reserves an attempt before checking the hash; only five attempts are allowed per code.
8. If the code is correct, the backend consumes it and returns a JWT.

An **atomic update** is one database operation that cannot be partly interleaved with another update. The consumption condition checks that the stored code is still the expected one. If two requests verify concurrently, only one can successfully consume that code.

Email verification proves access to the mailbox. It does not query an official enrollment system or prove ownership of an item.

### Reporting and viewing your own items

1. JavaScript reads and trims form values.
2. `apiRequest()` sends `POST /api/items` with JSON and the JWT.
3. `requireAuth` derives the reporter identity from the verified token.
4. `reportItem` creates the MongoDB document.
5. The server returns `201 Created`.
6. The frontend shows success and opens My Reports.

The backend uses the authenticated email instead of trusting a reporter email supplied in the form. Found items default to room 8001, but the form allows another room. This records the reported hand-in location; it does not independently verify physical handover.

### Search and privacy

Search calls `/api/items/search` with query parameters such as `?q=bag&type=lost`. A **query parameter** is a filter appended to the URL.

Public responses include fields such as name, description, category and location. The explicit allowlist excludes email and phone. Owners can see their own private report data through `/mine`; the configured admin can access the full report list.

Descriptions remain public. If someone types a phone number into the description, field filtering does not automatically remove it.

### Safe rendering and item dialogs

The old rendering approach embedded an entire item inside an inline HTML click handler. A name containing an apostrophe could break the handler, and malicious input could inject attributes.

The updated approach renders escaped text and separately attaches event listeners:

```js
button.addEventListener("click", () => viewItemDetails(item));
```

The item stays a JavaScript object instead of becoming executable HTML. `textContent` is used for alert messages. This fixes the identified injection path, but does not mean every possible security issue has been eliminated.

## 8. Understand the matching algorithm

This is deterministic, rule-based matching: the same inputs produce the same score. No model is trained and no external AI service is called.

| Feature | Maximum points |
| --- | ---: |
| Exact category match, ignoring case | 30 |
| Item-name similarity | 25 |
| Description similarity | 15 |
| Location similarity | 20 |
| Report-date proximity | 10 |

### Comparing text

First, text is lowercased and trimmed. Exact matches get similarity 1; a substring match gets 0.85. Otherwise, text is split into meaningful words, with punctuation and common words removed, and word overlap is measured.

**Jaccard similarity = number of shared unique words ÷ number of unique words across both texts.**

For “blue school bag” and “blue travel bag,” the shared words are `blue` and `bag`. The combined unique words are `blue`, `school`, `bag`, `travel`. Similarity is `2 / 4 = 0.5`.

For an item name, 0.5 exceeds the partial-match threshold of 0.3, so it earns `round(0.5 × 25) = 13` points. A name similarity above 0.8 earns the full 25. Description and location use their own thresholds.

### Comparing dates and selecting matches

The date score is 10 points within two days, 7 within seven days, and 4 within fourteen days. It uses when reports were created, not when the objects were actually lost or found.

Only pending lost/found pairs from different reporters are considered. A total score of 30 or more qualifies, and the dashboard shows the highest five matches.

**Example:** same category (30), exact item name (25), exact location (20), reports within two days (10), no description similarity (0) = **85 points**.

“85% Match” is a display of the 85/100 score, not a statistically measured 85% probability. Matching category alone can meet the current threshold, so false positives are possible. Future improvements could require stronger combined evidence.

The current comparison work grows roughly as `number of your active reports × number of candidate reports`. That is manageable for a prototype, but candidate filtering and indexing become important as data grows.

## 9. APIs, status codes and error handling

| Endpoint | Access and purpose |
| --- | --- |
| `POST /api/auth/send-otp` | Public, rate-limited code request. |
| `POST /api/auth/verify-otp` | Public, rate-limited verification. |
| `POST /api/items` | Logged-in report creation. |
| `GET /api/items/mine` | Logged-in user's reports. |
| `GET /api/items/search` | Public filtered search. |
| `GET /api/items/:id` | Public details; `:id` is a document identifier. |
| `GET /api/items/matches` | Logged-in user's possible matches. |
| `GET /api/items/dashboard-stats` | Logged-in counts and top matches. |
| `GET /api/items` | Admin-only full private report list. |
| `GET /api/health` | Basic running-API response. |

Useful HTTP status codes: **200** success, **201** created, **400** invalid request, **401** missing/invalid login, **403** forbidden, **404** not found, **429** too many requests, **500** unexpected server error, **503** temporarily unavailable.

`try/catch` handles expected failures, such as mail delivery failing. The async wrapper forwards rejected controller operations to the central error handler. Some malformed item/search inputs currently become generic server errors; better validation and useful 4xx responses remain on the backlog.

## 10. Testing: what the checks prove

The project uses Node's built-in test runner. An **assertion** checks an expected result and fails the test if it is wrong.

```js
assert.equal(response.status, 401);
```

A **mock** or substitute replaces a real dependency with controlled behavior. Tests substitute MongoDB model operations and email delivery, so they do not modify the real database or send actual OTP emails.

jsdom creates a simulated HTML document. Tests can render hostile text, inspect the resulting DOM, click Details and check the displayed title. It does not provide a real layout engine for evaluating screen sizes or visual appearance.

The latest recorded verification had eight passing tests covering email validation, resend cooldown, failed-attempt limits, OTP expiry/replay, API privacy/access/rate limits, safe match data and rendering across three item views.

Syntax checks confirm JavaScript can be parsed. `npm audit` checks known dependency advisories. Neither proves complete functional correctness or production security. Real MongoDB concurrency, SMTP delivery and browser layout testing are still required.

## 11. Run the project and diagnose common problems

Use a Node version supported by `package.json`: Node 22.13+ within 22.x, or Node 24+.

```powershell
cd lost-and-found-backend
npm ci
npm start
```

Configure the database, SMTP and JWT settings first, then visit `http://localhost:5000`. The backend serves the frontend and `/api` from the same origin. `config.js` can point to a separate API if hosting is split; permitted frontend origins must then be configured on the server.

| Symptom | First things to check |
| --- | --- |
| Server does not start | JWT configuration, database address and database connectivity. |
| OTP email does not arrive | SMTP configuration, provider response and spam folder. |
| Request gets 401 | Token missing, expired or invalid; log in again. |
| Request gets 403 | Account lacks the required permission. |
| Request gets 429 | Cooldown or rate limit reached; wait for the limit to reset. |
| Search/API fails from another frontend address | API base address and CORS configuration. |
| Dashboard has no matches | Need an opposite-type pending report from another reporter meeting the threshold. |

Do not open HTML using `file://`. Do not solve a database-access problem by blindly allowing all network addresses; use access appropriate to the deployment.

## 12. Honest answers for the evaluator

**“Is this a MERN project?”** No. It uses MongoDB, Express and Node, but the frontend is plain HTML/CSS/JavaScript rather than React.

**“Does it use AI?”** It uses a rule-based similarity algorithm, not machine learning. The score is explainable through matching fields.

**“Is it real-time?”** The dashboard fetches data on page load. There are no WebSockets or live push updates.

**“Is it a complete CRUD application?”** It currently creates and reads reports. Full update/delete operations and a return-status transition are not implemented. CRUD means Create, Read, Update and Delete.

**“How does the admin log in?”** Through the same college-email OTP flow. The configured `ADMIN_EMAIL` receives extra API access; there is no dedicated admin interface yet.

**“Can someone mark an item returned?”** Not through the current application. The schema supports `resolved` and the dashboard can count it, but an authorized update flow is still needed.

**“Why can students search without login?”** Public discovery helps people find reported items. Private contact fields are excluded, and submitting reports still requires login.

**“What would you improve next?”** Add stronger validation, pagination, a verified claim/return workflow, accessible dialogs and forms, real-browser testing and shared rate limits for multiple servers.

**“What did the security update improve?”** It removed unsafe item click handlers, restricted contact data, strengthened OTP protections, removed the hardcoded localhost API dependency and updated vulnerable dependencies. It did not establish complete production readiness.

## 13. A practical study order

1. Read `index.html`, a report form and the related CSS. Identify the elements and class names.
2. Follow that form's submit handler in `script.js`, then read `apiRequest()`.
3. Find its route in `itemRoutes.js` and follow `requireAuth` into the controller.
4. Read `Item.js` to connect the request fields to stored fields.
5. Follow login through `authController.js`, `otp.js` and `mailer.js`.
6. Calculate one example score manually, then compare it with `matchService.js`.
7. Read the tests and explain what each assertion is checking.
8. Practice describing implemented behavior separately from planned improvements.

Try answering these without looking: Where is the reporter email obtained? Why is a JWT signature useful? Why is hashing different from encryption? Why is a match not proof of ownership? Why do passing mocked tests not prove real email delivery?

If you can answer those and trace a report from the browser into MongoDB and back, you understand the core project rather than only memorizing its file names.
