# FindIt@Campus — Project Study Guide

Use this guide for a project demo or viva. It describes the current implementation, including its limitations.

## 1. A 30-second introduction

> FindIt@Campus is a campus lost-and-found web application. Students log in using an OTP sent to their college email, report lost or found belongings, search reports, and view possible matches. The frontend uses HTML, CSS and JavaScript. The backend uses Node.js and Express, with MongoDB for storage. Matching uses an explainable scoring algorithm based on item details. A complete claim and return-verification workflow is planned but not yet implemented.

## 2. Technology and architecture

| Technology | Purpose in this project |
| --- | --- |
| HTML | Defines pages, forms and content. |
| CSS | Controls appearance, spacing and responsive layouts. |
| JavaScript | Handles forms, API requests, login state and dynamic results. |
| Node.js | Runs JavaScript on the server. |
| Express | Receives HTTP requests and connects them to backend functions. |
| MongoDB | Stores user and item documents. |
| Mongoose | Defines document structure and provides database query methods. |
| Nodemailer / SMTP | Sends OTP emails through a configured email server. |
| JWT / jsonwebtoken | Provides signed login tokens for protected API requests. |
| bcryptjs | Hashes OTPs before database storage and compares submitted codes. |
| express-rate-limit | Limits repeated authentication requests from an IP address. |
| dotenv / cors | Loads environment settings / controls permitted cross-origin browser access. |
| Node test runner / jsdom | Runs regression tests / simulates the browser document for DOM tests. |

**Request path:** Browser → Express route → middleware → controller → Mongoose/MongoDB → JSON response → browser update.

An **API** is how the frontend requests data or actions from the backend. **JSON** is the text format used to exchange that data. The backend also serves the frontend files, so both use the same website address by default.

## 3. Folders and files — quick reference

### Root and frontend

| File or folder | What to say if asked |
| --- | --- |
| `findit-campus-frontend/` | Contains the pages and browser-side code. No React or frontend build framework is used. |
| `index.html` | Home page explaining the service and linking to report forms. |
| `login.html` | College email and OTP login interface. |
| `report-lost.html` | Form for reporting a lost item. |
| `report-found.html` | Form for a found item, including its hand-in room. |
| `search.html` | Public search with item type, category and location filters. |
| `my-reports.html` | Displays the logged-in user's reports. |
| `dashboard.html` | Shows report totals, possible matches and returned-item count. |
| `style.css` | Shared page styling, cards, forms, dialogs and responsive rules. |
| `script.js` | Shared frontend logic: authentication, API calls, forms, search, dashboard and item dialogs. |
| `config.js` | Sets the API base address; defaults to `/api`. Contains no secrets. |
| `AUDIT-REPORT.md` | Records security changes, checks and remaining issues. |
| `PROJECT-STUDY-GUIDE.md` | This revision guide. |
| `.git/` | Git version history and repository metadata. |
| `.gitignore` files | Git uses these to identify files that should not be tracked. |

### Backend: `lost-and-found-backend/`

| File or folder | Responsibility |
| --- | --- |
| `server.js` | Entry point: configures Express, CORS, API routes, static frontend hosting and error handling; starts after database connection. |
| `config/db.js` | Connects to MongoDB using the configured connection string. |
| `routes/authRoutes.js` | Maps OTP request and verification URLs to their handlers and rate limits. |
| `routes/itemRoutes.js` | Maps report, search, personal report, match and dashboard URLs. |
| `controllers/authController.js` | Validates college email, issues OTPs, checks attempts and returns JWTs after verification. |
| `controllers/itemController.js` | Creates reports, reads items, searches and prepares match/dashboard responses. |
| `models/User.js` | Defines the user document and OTP-related fields. |
| `models/Item.js` | Defines lost/found report fields and status. |
| `middleware/auth.js` | Checks the JWT before allowing a protected request. |
| `middleware/admin.js` | Allows the configured admin email to access all private reports. |
| `middleware/authLimits.js` | Applies IP-based limits to OTP endpoints. |
| `utils/otp.js` | Generates secure six-digit codes and hashes/compares them. |
| `utils/mailer.js` | Sends the OTP email through SMTP. |
| `utils/matchService.js` | Calculates match scores and explains the contributing similarities. |
| `utils/publicItem.js` | Allows only approved fields into public item responses. |
| `utils/asyncHandler.js` | Passes rejected asynchronous operations to Express error handling. |
| `test/security.test.js` | Tests authentication protections, privacy and safe item rendering. |
| `package.json` | Lists dependencies, Node requirements and start/dev/test commands. |
| `package-lock.json` | Records exact dependency versions for repeatable installation. |
| `.env` | Local server configuration and secrets; never show its values during a demo. |
| `.env.example` | Example settings to help configure the project. |
| `README.md` | Setup instructions, API overview and security/deployment notes. |
| `node_modules/` | Installed dependency code; generated by npm, not application code to study. |

The frontend also contains a lockfile; the active npm scripts and application dependency setup are in the backend.

**Remember:** Routes choose the handler. Middleware checks the request. Controllers perform the operation. Models describe stored data. Utilities provide reusable helpers.

## 4. Main flows

**Login:** Enter college email → backend validates the domain → generates and hashes an OTP → stores its expiry and sends email → verifies the submitted code → consumes the OTP → returns a JWT. The frontend stores the token and email in localStorage. Later requests send `Authorization: Bearer <token>`.

**Report an item:** Fill the form → frontend sends JSON → authentication middleware verifies the token → controller creates an item using the authenticated email → MongoDB stores it → frontend shows success and opens My Reports. Found items default to room **8001**; the form allows another room.

**Search:** Enter keywords/filters → public search endpoint queries MongoDB → returns public fields → frontend renders result cards. Details buttons open a dialog using the item data already loaded.

**Dashboard:** Backend loads the user's reports → counts reports and resolved items → compares pending reports with other users' pending reports → returns match count and the top five matches. Data is fetched on page load; there are no live push updates.

## 5. Database structure

| Collection | Main information |
| --- | --- |
| `users` | Unique email, OTP hash, expiry, attempt count, last-send time, verification flag and timestamps. |
| `items` | Lost/found type, name, description, category, location, room, reporter email, contact number, pending/resolved status and timestamps. |

Reports link to users through `reporterEmail`, not a separate user ObjectId reference. A report starts as `pending`. Passwords and plaintext OTPs are not stored in the database.

## 6. How smart matching works

| Comparison | Maximum points |
| --- | ---: |
| Same category | 30 |
| Similar item name | 25 |
| Similar description | 15 |
| Similar location | 20 |
| Reports created close together | 10 |
| **Total** | **100** |

Text is lowercased and compared using exact matches, substring matches and overlapping meaningful words. Word overlap uses **Jaccard similarity: shared unique words ÷ all unique words**. Date points are 10 within two days, 7 within a week, or 4 within two weeks.

Only opposite types from different reporters are compared. Scores of **30 or more** qualify; results are sorted highest first. For example, matching category and name alone can produce 55 points.

**Explain accurately:** This is a rule-based algorithm, not a trained machine-learning model. “80% Match” means 80 out of 100 scoring points, not an 80% probability of ownership. Dates are report-creation dates, not the actual loss/finding time.

## 7. API routes to remember

| Method and path | Purpose / access |
| --- | --- |
| `POST /api/auth/send-otp` | Request code; public, rate-limited. |
| `POST /api/auth/verify-otp` | Verify code and receive JWT; public, rate-limited. |
| `POST /api/items` | Create a report; login required. |
| `GET /api/items/mine` | Own reports; login required. |
| `GET /api/items/search` | Search public item information. |
| `GET /api/items/:id` | Public details for one item. |
| `GET /api/items/matches` | Possible matches; login required. |
| `GET /api/items/dashboard-stats` | Counts and top matches; login required. |
| `GET /api/items` | Full private report list; configured admin only. |
| `GET /api/health` | Basic API health response. |

`POST` submits data; `GET` retrieves it. `:id` represents a specific item's identifier.

## 8. Likely evaluator questions — short answers

**Why OTP instead of passwords?** It verifies access to a college mailbox and avoids a password/reset workflow. It does not check an official student enrollment database.

**Authentication versus authorization?** Authentication checks who is logged in. Authorization decides what that person may access, such as the admin report list.

**How are OTPs protected?** Secure random generation, hashed storage, expiry, a 60-second resend cooldown, five attempts per code, IP limits and atomic single-use consumption. Atomic means competing requests cannot both consume the same code successfully.

**How is private data protected?** Public search/details and other people's match results exclude email and phone fields. Owners and the configured admin can access private report information. Public descriptions are still visible.

**What security issue was fixed in the frontend?** Item data was embedded inside HTML click handlers. It now uses event listeners, with escaped displayed text, preventing that attribute-injection path.

**Why MongoDB and Mongoose?** Reports fit naturally into document records; Mongoose provides schemas and query methods. MongoDB stores the data; Mongoose is the library used to access it.

**What happens at logout?** The browser deletes its stored token and email. There is no server-side token revocation list; a copied token remains usable until expiry.

**How was it tested?** Eight regression tests passed in the latest audit, covering OTP protections, API access/privacy and DOM rendering. Database and email behavior are substituted in these tests. Real MongoDB/SMTP and browser layout verification are still needed.

**What is unfinished?** Claim/return verification, a resolved-status update route, an admin UI, stronger input validation, pagination and accessibility improvements. The returned-items counter exists, but normal users cannot yet complete that status transition through the app.

## 9. Running and demonstrating it

From the project root:

```powershell
cd lost-and-found-backend
npm ci
npm start
```

Use a supported Node version and configure MongoDB, SMTP and JWT settings first. Open `http://localhost:5000`. Use `npm run dev` for automatic server restart and `npm test` for regression tests.

**Suggested demo:** Home → college-email login → report an item → My Reports → search → dashboard matches. Matching needs a suitable opposite-type report from another user. Do not promise a complete return workflow or production readiness.

**Last-minute memory line:** HTML/CSS/JS frontend; Node/Express backend; MongoDB storage; email OTP + JWT authentication; rule-based matching; private contact fields; claim/return workflow still pending.
