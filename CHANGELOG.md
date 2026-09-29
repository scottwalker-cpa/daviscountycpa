# DCCPA Website Changelog

The version number is shown in the site footer (`index.html`, next to the copyright).
Bump it with every significant change that gets uploaded to GitHub:
- **Minor** (1.1 → 1.2): new sections, features, or noticeable content/design changes.
- **Major** (1.x → 2.0): a redesign or restructure of the site.
- Typo fixes and tiny tweaks can ride along with the next version.

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
