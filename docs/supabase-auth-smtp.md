# Supabase Auth SMTP setup for Occu-Med Portal

The Occu-Med Portal login screen uses Supabase Auth magic links:

```ts
supabase.auth.signInWithOtp(...)
```

Because of that, magic-link email delivery is controlled inside the Supabase project, not inside Render and not by the frontend code.

## Required Supabase Auth settings

In Supabase, open the project connected to the portal and configure custom SMTP for Auth emails.

Use the domain mailbox SMTP settings:

```txt
SMTP host: smtp.newcloudsmart.com
SMTP port: 587
SMTP secure: false
SMTP user: alex.ayvazian@newcloudsmart.com
SMTP password: <mailbox password or app password>
Sender email: alex.ayvazian@newcloudsmart.com
Sender name: Occu-Med Portal
```

Use port `465` and secure `true` only if the mailbox provider specifically requires SSL-on-connect.

## Required Supabase redirect URLs

Set the Supabase Auth site URL and redirect allow-list to include the live Render portal URL.

Current live portal shown in troubleshooting screenshots:

```txt
https://occu-med-portal-jlmy.onrender.com
```

Allowed redirect URLs should include:

```txt
https://occu-med-portal-jlmy.onrender.com/setup-account
https://occu-med-portal-jlmy.onrender.com/**
```

If the service is using the alternate Render URL previously used for this app, include it too:

```txt
https://occu-med-portal-ljmv.onrender.com/setup-account
https://occu-med-portal-ljmv.onrender.com/**
```

## Why the 500 AuthApiError happens

A 500 response from `signInWithOtp` while sending the email usually means Supabase Auth could not send the Auth email. The most likely causes are:

- custom SMTP is not configured in Supabase Auth
- SMTP host/port/user/password is incorrect
- sender address is not allowed by the mailbox provider
- redirect URL is not allowed in Supabase Auth URL configuration
- the default Supabase email service is rate-limited or restricted

## Render environment variables still needed

Render still needs the Supabase client values so the frontend can connect to the correct Supabase project:

```txt
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
VITE_SUPABASE_STORAGE_BUCKET=portal-assets
```

SMTP values for magic links should be configured in Supabase Auth unless the app is refactored to use a custom backend email sender.
