# TABITO travel — Static deployment on cPanel

The app has **no server runtime** (no Nitro, no Node process). Everything runs in the browser
and the guide content is stored on the device (with JSON export/import for backup and transfer).

## 1. Build

```bash
bun install
bun run build:static
```

The ready-to-upload site is in `./static/`:

```
static/
  index.html      # SPA entry
  404.html        # same shell (deep-link fallback)
  .htaccess       # Apache rewrite so /guide, /live, /admin work on refresh
  assets/         # JS + CSS
  tabito-logo.png, favicon.png, robots.txt
```

## 2. Upload

1. cPanel → **File Manager** → open `public_html` (or the sub-domain folder, e.g. `public_html/tabito`).
2. Upload the **contents** of `static/` (not the folder itself).
3. Make sure hidden files are visible so `.htaccess` is uploaded too.
4. If you deploy in a sub-folder, edit `.htaccess` and set `RewriteBase /tabito/`.

## 3. HTTPS

Enable AutoSSL / Let's Encrypt in cPanel. **HTTPS is required** — browsers refuse GPS
geolocation on plain `http://`.

## 4. Admin access

Open `/admin` and enter the staff passcode defined in `src/lib/tabito.ts` (`ADMIN_PASSCODE`).
Change it before publishing. Since the site is static, content lives in the browser's local
storage: use **Export** to create `tabito-guide.json`, and **Import** on any other device to
publish the same guide there.
