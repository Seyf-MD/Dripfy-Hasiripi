# Email Branding Guide

Dripfy MIS uses the same palette in the app and in all transactional mails. The
PHP helpers `public/api/signup/common.php` and `public/api/auth/common.php`
expose the most important hooks:

| Helper | Purpose |
| ------ | ------- |
| `buildEmailTemplate()` | Wraps the HTML shell (background, header gradient, footer).
| `buildKeyValueList()` | Creates the two column table used in signup summaries.
| `buildCodeBlock()` | Highlights verification codes and reset tokens.

## Color Tokens

The templates mirror the light-theme colors defined in `index.html`:

```text
Primary brand       #4BA586 – #84A084
Surface background  #EDF6ED
Card background     #FAF9F6
Border              #C8D9B9
Primary text        #1E332A
Body text           #2F4A3B
```

If you adjust any token in the web app, update these constants so e-mails stay
in sync. Both helpers also write the plain-text alternative used when the SMTP
fallback (`mail()`) is triggered, therefore keep content updates in both the
HTML and text variants.

## Adding New Sections

1. Compose the HTML snippet (buttons, text blocks, etc.).
2. Pass it as the `$contentHtml` argument when calling `buildEmailTemplate()`.
3. Keep text colors above `#2F4A3B` for readability against the light surfaces.
4. When you add new strings, update the plain-text version directly below the
   HTML block so screen readers and text-only clients stay aligned.

## Local Preview

1. Run `npm run dev:full`.
2. Submit the signup or password reset flows.
3. Check your development mailbox – the node server uses the same template.

For production uploads the `scripts/ftp_upload.py` script copies the generated
files to the hosting environment.
