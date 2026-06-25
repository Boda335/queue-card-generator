# Queue Card Generator

Generates a PNG image showing a stacked carousel of the current queue (movies/series)
plus a "now playing" control bar with a progress bar — مزيج بين الكاردات المتراكبة
وبار التحكم بتاع الفيديو الثاني.

## Deploy on Vercel

1. Push this folder to a GitHub repo (or `vercel` CLI directly from this folder).
2. On vercel.com → New Project → import the repo. No env vars needed.
3. After deploy, your endpoint is:
   `https://YOUR_PROJECT.vercel.app/queue`

## Endpoint

`GET /queue`

| Param | Type | Description |
|---|---|---|
| `items` | JSON string (array) | Each item: `{ name, thumbnail, uploader: { name } }` — same shape as your existing `track` object |
| `currentIndex` | number | index in `items` of the currently playing item (0-based) |
| `progress` | number 0-100 | progress bar fill percentage |
| `currentTime` | string | e.g. `"38:12"` |
| `duration` | string | e.g. `"1:28:00"` |
| `volume` | number 0-100 | (kept for parity with createVinylCard, not drawn yet) |
| `paused` | boolean | `true`/`false` — switches the play/pause icon |
| `botIcon` | string (URL) | fallback thumbnail if an item has none |
| `scale` | number 1-4 | output resolution multiplier (default 2) |

## Usage from your bot (mirrors createVinylCard)

See `createQueueCard.js` — same pattern as your `createVinylCard`:

```js
const { createQueueCard } = require('./createQueueCard');

const url = await createQueueCard(
  queue,           // array of track-like objects
  currentIndex,    // which one is playing now
  progress,        // 0-100
  currentTime,
  duration,
  volume,
  paused,
  botIcon
);
```

## Local test (without deploying)

```
npm install
node test/make-thumbs.js   # generates dummy colored thumbnails
node test/local-test.js    # writes test/output.png
```

## Notes / things you may want to tweak

- Currently shows up to 2 items on each side of the current one (5 cards total). Change `visibleRange` in `api/queue.js` if you want more/fewer.
- Volume icon isn't drawn yet (wasn't in the reference screenshots) — easy to add next to the progress bar if you want it.
- Fonts: falls back to system sans-serif. If you want a specific font (Inter, etc.), drop `.ttf` files into a `fonts/` folder with those exact names, or edit the `GlobalFonts.registerFromPath` calls at the top of `api/queue.js`.
