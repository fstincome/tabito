// Turns the build output into a plain static folder ready for cPanel.
// Run: bun run build:static  ->  ./static/
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const CLIENT = "dist/client";
const OUT = "static";

if (!existsSync(CLIENT)) {
  console.error(`Missing ${CLIENT}. Run "bun run build" first.`);
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(CLIENT, OUT, { recursive: true });

// The SPA shell becomes index.html (and the 404 fallback).
const shellPath = `${OUT}/_shell.html`;
const shell = existsSync(shellPath)
  ? await readFile(shellPath, "utf8")
  : await readFile(`${OUT}/index.html`, "utf8");
await writeFile(`${OUT}/index.html`, shell);
await writeFile(`${OUT}/404.html`, shell);

// Apache rewrite so /guide, /live, /admin work on refresh.
await writeFile(
  `${OUT}/.htaccess`,
  `Options -MultiViews
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
`,
);

console.log(`Static site ready in ./${OUT} — upload its contents to public_html.`);
