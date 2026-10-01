# DCCPA Website Changelog

The version number is shown in the site footer (`index.html`, next to the copyright).
Bump it with every significant change that gets uploaded to GitHub:
- **Minor** (1.1 → 1.2): new sections, features, or noticeable content/design changes.
- **Major** (1.x → 2.0): a redesign or restructure of the site.
- Typo fixes and tiny tweaks can ride along with the next version.

## v1.3 (2026-09-30)
- Participating Agencies: each card shows the agency's seal as a faded background, with an icon for the class that agency teaches. Web-sized seals are in `Assets/images/web/seals/`.
- Removed the handcuffing demo photo from the gallery (18 photos now) and corrected 12 gallery photo captions.
- Fixed a console warning: the Cloudflare Turnstile script now loads after the page script.
- Added README.md, a plain-language guide to how the site is built.
- Apps Script: alert emails now send through GmailApp instead of MailApp (Google was rejecting MailApp mail from the new Workspace account). Added a `sendTestEmail` admin function.

## v1.2 (2026-09-29)
- Application form security: added Cloudflare Turnstile human verification on step 3.
- Apps Script backend hardened: the server checks each Turnstile token, including its hostname and action.
  - It rate-limits submissions (20 per 10 min, 150 per day) and allows one application per email per 6 hours.
  - It validates every field on the server.
  - It refuses all submissions if not configured, rather than accepting unverified ones.
- Secrets and settings moved to Apps Script Script Properties (nothing sensitive in GitHub).
- Automatic daily cleanup of applications older than 365 days (configurable).
- Clearer error messages for applicants (verification failed, duplicate, busy, etc.).
- Participating Agencies: updated what Centerville, Bountiful, Farmington, Layton, West Bountiful and the Sheriff teach.
- New curriculum photos for Patrol & Field Operations (night traffic stop) and Judicial System & Corrections (the Attorney General presenting); the previous two moved into the gallery.
- Rewrote `apps-script/SETUP.md` with account security, Turnstile setup, and a plan for moving to daviscountycpa.org.

## v1.1 (2026-09-29)
- Hero section: class photo background behind a navy overlay.
- Curriculum: a photo on each of the six module cards.
- About: three-photo collage.
- New "From Past Classes" photo gallery (19 photos) with a full-size viewer; "Gallery" added to the menu.
- Web-sized photo copies in `Assets/images/web/` (location data removed).
- Replaced the Tailwind CDN script with a compiled stylesheet (`Assets/css/dccpa.css`).

## v1.0 (2026-09-29)
- The application form is wired to Google Sheets through Apps Script (`apps-script/`), with loading and error messages and spam protection.
- Removed the public "Admin Backend Setup" button.
- The logo loads from the site's own Assets folder; added a real Google Map, directions and tap-to-call.
- Added search and link-preview tags, robots.txt, sitemap.xml and a privacy notice on the application.
- Version number shown in the footer.
