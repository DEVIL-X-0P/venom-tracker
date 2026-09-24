# Tracko — Shree Furniture House

Tracko is Shree Furniture House's mobile-first workshop attendance and wage tracker. The dashboard shows the crew list, each worker's work completed this month, and their outstanding balance. Open a worker profile for their attendance calendar, total work, due balance, and payment history. It works immediately in local mode and can sync across devices through Supabase.

## Run locally

Serve this folder with any static web server (the app uses browser storage and the web app manifest):

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`. Add workers, open a worker's profile, and record attendance or payments. The currency/locale default to INR and `en-IN`; change them in `config.js` if needed.

## Enable accounts and cloud sync

1. Create a Supabase project.
2. Open its SQL Editor and run all of `supabase.sql`.
3. In Supabase Authentication settings, enable email/password sign-in. For quick personal use, you can turn off email confirmation; otherwise confirm the account from the email Supabase sends.
4. Copy the project URL and the public anon/publishable key (never use a service-role key in a browser) into `config.js`:

   ```js
   window.TRACKO_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",
     currency: "INR",
     locale: "en-IN"
   };
   ```

5. Host this folder over HTTPS, open the app, choose the account icon, then create the manager account. Existing device workers, attendance, and payments are merged into the account; records already in the cloud are kept when dates overlap.

The included row-level security policies scope worker, attendance, and payment records to the signed-in manager. The first sign-in merges device records into that manager's account. Keep a separate backup before clearing browser storage; local-mode records are only on that device.

## Add to Android home screen

Deploy the folder to an HTTPS host, open the URL in Chrome on Android, then use Chrome's menu and choose **Install app** or **Add to Home screen**.

## Behavior

- Work amount choices: 0, 0.5, 1, 1.5, or 2 times.
- Daily pay: selected work amount × that date's wage. The worker's usual wage is prefilled and can be overridden for one day.
- Zero work is saved as an explicit absence record and shows ₹0 pay.
- Notes are attached to one worker's entry for one date.
- The dashboard's work totals are for the current month; due balances are all-time earnings less all-time payments. A negative balance is shown as an advance.
- Payment history records the amount, date, and optional note. Payments can be edited or deleted later; changes update the worker's due balance and sync to the cloud when connected.
- Browser storage is used in local mode. In cloud mode, changes sync to the signed-in Supabase account while a connection is available.

## Limitations

Cloud changes sync when the app is online; there is no background sync or offline write queue yet. Local data is per browser/device until a manager signs in and completes the initial merge. A single manager account owns the records; shared multi-manager access is not included.
