import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publish = join(root, "publish");

const files = [
  "index.html",
  "styles.css",
  "amazons.html",
  "app.js",
  "ultimate-tic-tac-toe.html",
  "dots-and-boxes.html",
];

const publicUrl = (process.env.PUBLIC_URL || "https://monkey-droste.github.io/math-games")
  .trim()
  .replace(/\/+$/, "");

await mkdir(publish, { recursive: true });

for (const file of files) {
  await cp(join(root, file), join(publish, file));
}

await rm(join(publish, "assets"), { recursive: true, force: true });
await cp(join(root, "assets"), join(publish, "assets"), { recursive: true });

await writeFile(join(publish, ".nojekyll"), "");
await writeFile(
  join(publish, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${publicUrl}/sitemap.xml\n`,
);

const pages = ["", "amazons.html", "ultimate-tic-tac-toe.html", "dots-and-boxes.html"];
const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .map((page) => {
    const loc = page ? `${publicUrl}/${page}` : `${publicUrl}/`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

await writeFile(
  join(publish, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

console.log(`Synced ${files.length} files to ${publish}`);
console.log(`Sitemap URL base: ${publicUrl}`);
