# Tracko by Shree Furniture House

Tracko is a mobile-friendly workshop management app for custom furniture orders, invoices, customer payments, labour attendance, wage payments, daily sales and expenses.

## Run locally

Serve this folder using a static web server:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. Records are saved in this browser. The app reuses its earlier `daywork.v1.data` local storage key to retain existing Tracko data.

## Features

- Create custom furniture orders with customer details, production status timeline, itemized invoices, optional GST, costs, estimated profit and multiple payment receipts. Invoice and order numbers are assigned independently. Business/invoice details are editable in Settings. Orders are stored in the existing local data store; cloud users can run the updated SQL to sync them.


- Add and update workers. Name, phone number and usual daily wage are required. Address, alternate phone and Aadhaar number are optional. Aadhaar is not shown on the dashboard or report.
- Record attendance as 0, 0.5, 1, 1.5 or 2 times. Daily pay is work amount multiplied by the selected daily wage; add a work note for each date.
- Open a worker profile for their attendance calendar, current dues, total work, editable payment history, and a worker-specific PDF export. The report includes only that worker's attendance, payments, earnings and due balance.
- Open **Sales & expenses** on the dashboard to add multiple sale and expense entries per date, with notes. Its calendar shows the daily totals and lets you review or edit each transaction. Older one-total-per-day records are imported as one sale and one expense transaction.
- Monthly estimated profit is sales minus recorded operating expenses. Labour dues and payments are tracked separately and do not reduce business profit.
- Export a worker's shareable report from their profile using **Export PDF**, then select **Save as PDF** in the browser's print dialog. On Android, share the saved PDF from Downloads.
- Set the admin name, phone, business name and address using the round profile button at the upper left. Admin details appear in exported reports.

## Enable cloud sync

1. Create a Supabase project.
2. Run all of `supabase.sql` in the Supabase SQL Editor. It adds worker contact columns, business transactions, order storage and invoice business settings to an existing Tracko database.
3. Enable email and password authentication in Supabase.
4. Add your project URL and public anon key in `config.js` (never use a service-role key in browser code):

   ```js
   window.TRACKO_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",
     currency: "INR",
     locale: "en-IN"
   };
   ```

5. Host the folder over HTTPS. Open Tracko, choose the cloud icon and create or sign in to the manager account. Existing device records merge into the account.

Row-level security scopes cloud records to the signed-in manager. Admin profile details are synced with the manager account. Local records stay available in the browser on this device.

## Forgot password

If the manager cannot remember the password:

1. Open the cloud icon in the top bar and choose **Forgot password?**
2. Enter the account email and choose **Send reset link**. Supabase emails a reset link to that address. Tracko reports success without revealing whether the address exists.
3. Open the emailed link. Tracko detects the link, clears it from the address bar and opens **Set new password**.
4. Enter the new password twice. Tracko saves it, signs the manager in and pulls the cloud records.

If the link has expired, or the account email no longer exists, ask the owner to create a fresh account or use Supabase Authentication to set the password.

## Host on Vercel

The folder is plain static files, so deploy it as-is:

```bash
npx vercel deploy --prod
```

Or import the folder at [vercel.com/new](https://vercel.com/new). Vercel serves `index.html` with no build step. No `vercel.json` is required.

### Required Supabase settings for the reset email

The password reset email links back to this app, so Supabase must be told the app's address. In **Supabase → Authentication → URL Configuration**:

- **Site URL**: set it to the production address, for example `https://labour-tracker.vercel.app`.
- **Redirect URLs**: add the same address. Also add any preview deployment addresses you want to test, such as `https://labour-tracker-*.vercel.app`.

Tracko sends `redirect_to` built from the address the browser is currently on (`location.origin + location.pathname`), so the same build works on a preview URL as long as that URL is allowed. If the app is served from a sub-path, or a redirect is needed to a different host, set it explicitly in `config.js`:

```js
window.TRACKO_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",
  resetRedirectUrl: "https://YOUR_PROJECT.supabase.co/auth/v1/verify", // optional override
  currency: "INR",
  locale: "en-IN"
};
```

If a reset email opens the wrong page, the address is missing from Redirect URLs. Tracko shows the exact address it expects in the Forgot password dialog.

### Deliverable email

Supabase's built-in test email is rate limited and only reaches project members. Before real owners use **Forgot password?**, connect a custom SMTP provider under **Supabase → Project Settings → Email** (any transactional provider works). Also confirm **Authentication → Email** has **Confirm email** enabled, so reset addresses always match a confirmed account.

## Install on Android

Host the folder at an HTTPS address, open it in Chrome on Android, then use the browser menu and select **Install app** or **Add to Home screen**.

- Export the selected month's sales and operating expenses as a shareable PDF from the Sales & expenses page. The selected day also shows net sales less expenses, and the dashboard has a quick action to enter today's sale.
