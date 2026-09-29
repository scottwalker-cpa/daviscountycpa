# Connecting the Application Form to Google Sheets

The website is static (GitHub Pages), so it sends applications to a small Google
Apps Script attached to a Google Sheet. Setup takes about 10 minutes and is done once.

## 1. Create the Sheet
1. Sign in to the Google account that should **own** the applicant data. Use a
   department or program account if you can, not a personal one.
2. Create a new Google Sheet and name it something like `DCCPA Applications`.
3. Share it **only** with the coordinators who review applications.

## 2. Add the script
1. In the Sheet, open **Extensions > Apps Script**.
2. Delete everything in `Code.gs` and paste in the contents of `apps-script/Code.gs`.
3. Near the top of the file, set `NOTIFY_EMAIL` to the address that should receive the
   "new application" emails.
4. Click **Save**.

## 3. Deploy it as a web app
1. Click **Deploy > New deployment**, then the gear icon, then **Web app**.
2. Set **Execute as:** *Me*, and **Who has access:** *Anyone*.
   ("Anyone" lets the website post to the script. It does **not** give anyone
   access to the Sheet.)
3. Click **Deploy** and approve the permissions Google asks for (Sheets + send email).
4. Copy the **Web app URL**. It ends in `/exec`.
5. To test it, open that URL in a browser. You should see `{"result":"ok",...}`.

## 4. Point the website at it
1. In `index.html`, find this line:
   ```js
   const GOOGLE_SHEET_APP_URL = "";
   ```
2. Paste the `/exec` URL between the quotes, then commit and push to GitHub.
3. Submit a test application on the live site. Check that a row appears in the
   **Applications** tab and that the email arrives, then delete the test row.

Until the URL is filled in, the form tells applicants to call Centerville PD instead
of claiming their application was received.

## Updating the script later
If you edit `Code.gs`, go to **Deploy > Manage deployments**, click the pencil icon,
set **Version: New version**, and click **Deploy**. This keeps the same URL, so the
website doesn't need to change.

## Handling applicant data
The Sheet holds dates of birth, driver license numbers, and criminal-history answers.
- Keep sharing limited to the people who review applications. Never share it by link.
- Delete or archive rows for each cohort once background checks are done.
- The notification email includes only name, email, phone and any disclosure flags.
  All other details stay in the Sheet.
