const { icon } = require('../Config/config.json');

/**
 * Builds the URL for the queue card image (stacked cards + progress bar).
 * Mirrors the pattern used in createVinylCard.
 *
 * @param {Array} items - full queue, each item shaped like the existing track object:
 *   { name, thumbnail, uploader: { name } | string }
 * @param {number} currentIndex - index of the currently playing item in `items`
 * @param {number} progress - 0-100
 * @param {string} currentTime - e.g. "1:23"
 * @param {string} duration - e.g. "5:24"
 * @param {number} volume - 0-100
 * @param {boolean} paused
 * @param {string} botIcon - fallback thumbnail/icon
 */
async function createQueueCard(
  items,
  currentIndex,
  progress,
  currentTime,
  duration,
  volume = 100,
  paused = false,
  botIcon
) {
  const normalizedItems = (items || []).map((track) => ({
    name: track?.name || 'Unknown',
    thumbnail: track?.thumbnail || botIcon || icon,
    uploader: {
      name: (typeof track?.uploader === 'string' ? track.uploader : track?.uploader?.name) || 'Unknown',
    },
  }));

  const params = new URLSearchParams({
    items: JSON.stringify(normalizedItems),
    currentIndex: currentIndex ?? 0,
    progress: Math.max(0, Math.min(100, progress ?? 0)),
    currentTime: currentTime ?? '0:00',
    duration: duration ?? '0:00',
    volume: Math.max(0, Math.min(100, volume ?? 100)),
    paused: paused ? true : false,
    botIcon: botIcon || icon,
    scale: 2,
  });

  return `https://your-project-name.vercel.app/queue?${params.toString()}`;
}

module.exports = { createQueueCard };
