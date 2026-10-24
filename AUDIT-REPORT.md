# FindIt@Campus — Updated audit

Date: 2026-10-14
Scope: Remediate the five high-priority findings from the initial audit. No deployment or live database changes performed.

## Status

The identified high-priority code issues have been addressed. This is not a production-readiness certification: real MongoDB/SMTP integration and browser testing remain outstanding, and the medium-priority backlog below is unchanged.

| Original finding | Change | Evidence |
| --- | --- | --- |
| Unsafe item JSON in inline click handlers | Search, My Reports and dashboard now bind event listeners to item objects. Report content is never serialized into executable HTML attributes. Alerts use textContent; rendered errors are escaped. | jsdom regression checks render apostrophes and hostile markup in all three views, verify no injected element/attribute, click Details and check the original item title. |
| Public contact-data exposure | Search and public detail routes use an explicit field allowlist at query and response boundaries. Match responses omit the other reporter's email/phone. Owner and admin endpoints retain protected private data. | HTTP regression checks public redaction, unauthenticated rejection, student rejection at the admin endpoint, and authorized owner/admin response paths; match serialization test. |
| OTP abuse and replay | Cryptographic randomInt; strict single college-address validation; MongoDB-backed 60-second account cooldown; maximum five attempts per code; atomic attempt reservation and code consumption; IP limits of 10 sends and 30 verifications per 15 minutes. | Tests cover concurrent resend, exhausted attempts, expiry, concurrent verification/replay, email validation and both HTTP rate limits. Model behavior is substituted in tests; MongoDB concurrency still requires integration verification. |
| Hardcoded localhost API | Default /api; backend serves the frontend; config.js supports a separate API origin. Cross-origin access is restricted to configured CORS_ORIGINS. Added /api/health. | HTTP static/config serving and permitted/disallowed CORS-origin checks. |
| Vulnerable dependencies | Express 5.3.0, Nodemailer 10.1.1 and updated lockfile. Replaced nodemon with Node's built-in watcher. Added express-rate-limit and jsdom regression tooling. | npm audit reports zero vulnerabilities, including development dependencies, at audit time. |

## Verification

- `npm test`: 8 tests covering the scenarios above.
- All 19 project JavaScript files pass `node --check`.
- `git diff --check`: no whitespace errors.
- No real emails sent, no real database records modified, no credentials printed or committed.
- jsdom validates DOM behavior, not rendered layout, contrast or real-browser behavior.

## Deployment and operational requirements

1. Use Node 22.13+ in the 22.x line, or Node 24+. Run `npm ci` in `lost-and-found-backend`.
2. Configure MongoDB and SMTP in the local environment. Set a random JWT_SECRET of at least 32 characters. Existing environment files were not edited.
3. Run `npm start` (or `npm run dev`) and open `http://localhost:5000`. Do not use file:// to open the frontend.
4. Serve production traffic over HTTPS. Separate frontend hosting requires updating config.js and CORS_ORIGINS.
5. IP quotas currently use process memory. Configure a shared limiter store before multiple-instance deployment. Review exact trusted-proxy settings before deploying behind a proxy; otherwise the proxy IP can receive a shared quota.
6. Test OTP delivery and authenticated report submission against a staging MongoDB/SMTP setup. Express and Nodemailer crossed major versions; actual SMTP compatibility has not been verified.
7. Public descriptions remain public. Contact fields are protected, but text typed into descriptions is not automatically redacted. Matches no longer reveal another reporter's direct contact details; campus hand-in information remains available.

## Remaining improvements

| Priority | Remaining work |
| --- | --- |
| Medium | Validate item field types/lengths and identifiers; escape search regex input; map malformed requests to useful 4xx responses. |
| Medium | Add pagination, search indexes and bounded matching work. |
| Medium | Implement authorized claim/return verification and resolved-status transitions. |
| Medium | Add accessible search labels, modal focus management, visible filter focus and announced loading/error states. |
| Medium | Preserve report drafts across login/session expiry and cancel outdated search requests. |
| Medium | Verify phone/tablet/laptop/wide layouts and keyboard navigation in a real browser. No browser connection was available during the audit. |
| Low | Consolidate duplicated CSS declarations and record product/design decisions in BRIEF.md and DESIGN.md. |

## Files to start with

- Frontend rendering: findit-campus-frontend/script.js
- Frontend API configuration: findit-campus-frontend/config.js
- OTP logic: lost-and-found-backend/controllers/authController.js
- Rate limits: lost-and-found-backend/middleware/authLimits.js
- Public response contract: lost-and-found-backend/utils/publicItem.js
- Regression suite: lost-and-found-backend/test/security.test.js
- Setup and privacy behavior: lost-and-found-backend/README.md
