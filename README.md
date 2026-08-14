# Math Games

Math Games is an unofficial fan-made static website inspired by Ben Orlin's
*Math Games with Bad Drawings*. It currently includes:

- Game of the Amazons
- Ultimate Tic-Tac-Toe
- Dots and Boxes
- Order and Chaos
- 3D Tic-Tac-Toe
- Chess

## Edit Locally

Open this folder and edit the root files:

- `index.html` for the homepage
- `styles.css` for the shared look
- `amazons.html` and `app.js` for Game of the Amazons
- `ultimate-tic-tac-toe.html` for Ultimate Tic-Tac-Toe
- `dots-and-boxes.html` for Dots and Boxes
- `order-and-chaos.html` and `order-and-chaos.js` for Order and Chaos
- `three-d-tic-tac-toe.html` and `three-d-tic-tac-toe.js` for 3D Tic-Tac-Toe
- `chess.html` and `chess.js` for Chess

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

After the site is public, submit the generated `sitemap.xml` URL to search
engine webmaster tools so search engines can discover it faster:

- Baidu Search Resource Platform: `https://monkey-droste.github.io/math-games/sitemap.xml`
- Google Search Console: `https://monkey-droste.github.io/math-games/sitemap.xml`

For Baidu, verify the site owner first, then submit the sitemap in the Baidu
Search Resource Platform. The pages now include bilingual search descriptions
for terms such as Math Games with Bad Drawings online, Ben Orlin math games,
数学游戏, 手绘小游戏, and 在线策略游戏.
