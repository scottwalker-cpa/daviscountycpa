# Davis County Citizens Police Academy Website

**Live site:** https://daviscountycpa.com
**Site admin:** Scott Walker (scott.walker@daviscountycpa.com)

This is a plain guide to how the website works and where each piece lives.

---

## How it fits together

```
Visitor  →  daviscountycpa.com (GitHub Pages)
                │  fills out the application
                ▼
         Cloudflare Turnstile  (checks the visitor is a real person)
                ▼
         Google Apps Script  (checks the application and saves it)
                ▼
         Google Sheet "DCCPA Applications"  +  email alert to coordinators
```

## The parts

| Part | What it does | Where to find it |
|---|---|---|
| **Website files** | Everything visitors see: pages, photos, styling | This GitHub repository. Local copy: `D:\DCCPA Website` |
| **Hosting** | Publishes the files as a website for free | GitHub Pages: in this repository, go to **Settings → Pages** |
| **Domain name** | The address daviscountycpa.com | Squarespace Domains: https://account.squarespace.com/domains |
| **Google Workspace** | The @daviscountycpa.com email accounts | https://admin.google.com |
| **Applications Sheet** | Every submitted application, one row each | Google Drive (https://drive.google.com) → **DCCPA Applications** |
| **Application script** | Receives applications, saves them and sends alerts | In the Sheet: **Extensions → Apps Script** ("DCCPA Application Backend"), or https://script.google.com |
| **Spam protection** | The "I'm human" check on the application | Cloudflare: https://dash.cloudflare.com → **Turnstile** → "DCCPA Application" |

All accounts are signed in as **scott.walker@daviscountycpa.com**.

## What's in this repository

| File or folder | What it is |
|---|---|
| `index.html` | The whole website (one page) |
| `Assets/images/` | Original class photos |
| `Assets/images/web/` | Smaller copies of the photos used on the site |
| `Assets/css/dccpa.css` | The site's styling |
| `Assets/DCCPA_Seal_Trans-300x300.png` | The DCCPA seal and logo |
| `apps-script/` | A copy of the application script and its setup guide (`SETUP.md`) |
| `tailwind/` | The tools used to rebuild the styling file |
| `CHANGELOG.md` | What changed in each version |

## Common tasks

- **See new applications:** open the **DCCPA Applications** Sheet in Google Drive.
- **Change who gets application emails:** open Apps Script, go to **Project Settings** (gear icon) → **Script Properties**, and edit `NOTIFY_EMAIL`. Separate multiple addresses with commas.
- **Update the website:** edit the files, bump the version number in the footer, note the change in `CHANGELOG.md`, and upload to this repository. The site updates in 1–2 minutes.
- **Something's wrong with the form:**
  - In Apps Script, check **Executions** to see each submission and any rejection reason.
  - In admin.google.com, check **Reporting → Email Log Search** to see whether the alert emails were delivered.

## Good to know

- Applications are **deleted automatically after 365 days**.
- The secret Cloudflare key is stored only in Apps Script's **Script Properties**. Never put it in this repository, because the repository is public.
- The application's human check only works on the live site. Testing from a copy on your computer will show an error; that's expected.
- Share the Applications Sheet only with the people who review applications.
