# Math Games

Math Games is an unofficial fan-made static website inspired by Ben Orlin's
*Math Games with Bad Drawings*, the book described in this project as
*欢乐数学之游戏大闯关*. It currently includes:

- Game of the Amazons
- Ultimate Tic-Tac-Toe

## Edit Locally

Open this folder and edit the root files:

- `index.html` for the homepage
- `styles.css` for the shared look
- `amazons.html` and `app.js` for Game of the Amazons
- `ultimate-tic-tac-toe.html` for Ultimate Tic-Tac-Toe

To preview in a browser, run:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Prepare The Public Version

After changing local files, run:

```sh
node scripts/sync-publish.mjs
```

If you already know the public URL, include it so the sitemap is correct:

```sh
PUBLIC_URL="https://your-short-url.example" node scripts/sync-publish.mjs
```

Upload or deploy the `publish` folder. Netlify, GitHub Pages, Cloudflare Pages, and Vercel can all host this as a static site.

## Simple Public URL

For a simple URL, use one of these:

- A free hosting subdomain such as `math-games-yourname.netlify.app`
- A custom domain such as `mathgames.example.com`
- A short domain you own, connected to the hosting service

After the site is public, submit the generated `sitemap.xml` URL to Google Search Console so search engines can discover it faster.
