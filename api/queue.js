const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Register a clean font (optional - falls back to system default if missing)
try {
  GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'fonts', 'Inter-Bold.ttf'),
    'InterBold'
  );
  GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'fonts', 'Inter-Regular.ttf'),
    'InterRegular'
  );
} catch (e) {
  // fonts are optional, canvas will fall back to default
}

const FALLBACK_THUMB =
  'https://via.placeholder.com/600x600/222222/666666?text=No+Image';

function safeParseItems(raw) {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function loadImageSafe(url) {
  try {
    return await withTimeout(loadImage(url), 6000);
  } catch {
    try {
      return await withTimeout(loadImage(FALLBACK_THUMB), 6000);
    } catch {
      // last resort: a plain 1x1-ish solid color image built in-memory
      const { createCanvas } = require('@napi-rs/canvas');
      const c = createCanvas(600, 600);
      const cx = c.getContext('2d');
      cx.fillStyle = '#333';
      cx.fillRect(0, 0, 600, 600);
      return loadImage(c.toBuffer('image/png'));
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clipRoundRect(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
}

function drawCoverImage(ctx, img, x, y, w, h, radius = 0) {
  ctx.save();
  if (radius > 0) clipRoundRect(ctx, x, y, w, h, radius);
  const ir = img.width / img.height;
  const r = w / h;
  let sx, sy, sw, sh;
  if (ir > r) {
    sh = img.height;
    sw = sh * r;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / r;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

module.exports = async (req, res) => {
  try {
    const {
      items: itemsRaw,
      currentIndex = '0',
      progress = '0',
      currentTime = '0:00',
      duration = '0:00',
      volume = '100',
      paused = 'false',
      botIcon,
      scale = '2',
    } = req.query;

    const items = safeParseItems(itemsRaw || '[]');
    const idx = Math.max(0, Math.min(items.length - 1, parseInt(currentIndex, 10) || 0));
    const current = items[idx] || { name: 'Unknown', thumbnail: botIcon, uploader: { name: 'Unknown' } };

    const currentName = current.name || 'Unknown';
    const currentThumb = current.thumbnail || botIcon || FALLBACK_THUMB;
    const currentUploader =
      (typeof current.uploader === 'string' ? current.uploader : current.uploader?.name) ||
      'Unknown';
    const isPaused = paused === 'true' || paused === true;
    const progressPct = Math.max(0, Math.min(100, parseFloat(progress) || 0));
    const SCALE = Math.max(1, Math.min(4, parseFloat(scale) || 2));

    // --- canvas setup ---
    const W = 1280 * SCALE;
    const H = 860 * SCALE;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // --- blurred background built from current thumbnail ---
    const bgImg = await loadImageSafe(currentThumb);
    ctx.save();
    ctx.filter = 'blur(60px) saturate(160%) brightness(0.55)';
    drawCoverImage(ctx, bgImg, -40 * SCALE, -40 * SCALE, W + 80 * SCALE, H + 80 * SCALE);
    ctx.restore();
    // dark overlay for contrast
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.25)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    // --- stacked carousel cards ---
    const cardW = 280 * SCALE;
    const cardH = 380 * SCALE;
    const centerX = W / 2;
    const centerY = H * 0.42;
    const spacing = 230 * SCALE;
    const visibleRange = 2; // show idx-2 .. idx+2

    const cardImages = await Promise.all(
      items.map((it) => loadImageSafe(it.thumbnail || botIcon || FALLBACK_THUMB))
    );

    for (let offset = visibleRange; offset >= -visibleRange; offset--) {
      const i = idx + offset;
      if (i < 0 || i >= items.length) continue;
      const isCenter = offset === 0;
      const distance = Math.abs(offset);

      const x = centerX + offset * spacing - cardW / 2;
      const scaleFactor = isCenter ? 1 : 1 - distance * 0.12;
      const rotation = isCenter ? 0 : offset * 0.06;
      const cw = cardW * scaleFactor;
      const ch = cardH * scaleFactor;
      const y = centerY - ch / 2 + (isCenter ? -20 * SCALE : 0);

      ctx.save();
      ctx.globalAlpha = isCenter ? 1 : 0.7 - distance * 0.12;
      ctx.translate(x + cw / 2, y + ch / 2);
      ctx.rotate(rotation);
      ctx.translate(-cw / 2, -ch / 2);

      // shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 30 * SCALE;
      ctx.shadowOffsetY = 12 * SCALE;

      roundRect(ctx, 0, 0, cw, ch, 22 * SCALE);
      ctx.fillStyle = '#111';
      ctx.fill();

      ctx.shadowColor = 'transparent';
      drawCoverImage(ctx, cardImages[i], 0, 0, cw, ch * 0.74, 22 * SCALE);

      // bottom gradient + text for the card
      ctx.save();
      clipRoundRect(ctx, 0, 0, cw, ch, 22 * SCALE);
      const grad = ctx.createLinearGradient(0, ch * 0.55, 0, ch);
      grad.addColorStop(0, 'rgba(20,20,20,0)');
      grad.addColorStop(1, 'rgba(15,15,15,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, ch * 0.55, cw, ch * 0.45);
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.font = `${isCenter ? 19 : 15} ${'InterBold'}`;
      ctx.font = `${(isCenter ? 19 : 15) * SCALE}px InterBold, sans-serif`;
      const title = truncate(ctx, items[i].name || 'Unknown', cw - 24 * SCALE);
      ctx.fillText(title, 16 * SCALE, ch * 0.84);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${(isCenter ? 14 : 11) * SCALE}px InterRegular, sans-serif`;
      const sub =
        (typeof items[i].uploader === 'string' ? items[i].uploader : items[i].uploader?.name) ||
        'Unknown';
      ctx.fillText(truncate(ctx, sub, cw - 24 * SCALE), 16 * SCALE, ch * 0.84 + 22 * SCALE);

      ctx.restore();
    }

    // --- bottom control bar (pill) ---
    const barMarginX = 70 * SCALE;
    const barW = W - barMarginX * 2;
    const barH = 110 * SCALE;
    const barX = barMarginX;
    const barY = H - 190 * SCALE;

    ctx.save();
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fillStyle = 'rgba(30,30,30,0.55)';
    ctx.fill();
    ctx.restore();

    // small thumbnail inside the bar
    const thumbSize = 70 * SCALE;
    const thumbX = barX + 20 * SCALE;
    const thumbY = barY + (barH - thumbSize) / 2;
    drawCoverImage(ctx, bgImg, thumbX, thumbY, thumbSize, thumbSize, 14 * SCALE);

    // play/pause + prev/next icons
    const iconY = barY + barH / 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4 * SCALE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const controlsCenterX = barX + barW * 0.62;
    const gap = 64 * SCALE;

    // prev (double triangle)
    drawSkip(ctx, controlsCenterX - gap, iconY, 14 * SCALE, true);
    // play/pause
    if (isPaused) {
      drawPlay(ctx, controlsCenterX, iconY, 16 * SCALE);
    } else {
      drawPause(ctx, controlsCenterX, iconY, 16 * SCALE);
    }
    // next
    drawSkip(ctx, controlsCenterX + gap, iconY, 14 * SCALE, false);

    // title + uploader text
    ctx.fillStyle = '#fff';
    ctx.font = `${20 * SCALE}px InterBold, sans-serif`;
    const textX = thumbX + thumbSize + 22 * SCALE;
    const textMaxW = controlsCenterX - gap * 1.8 - textX;
    ctx.fillText(truncate(ctx, currentName, textMaxW), textX, barY + barH * 0.42);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${15 * SCALE}px InterRegular, sans-serif`;
    ctx.fillText(truncate(ctx, currentUploader, textMaxW), textX, barY + barH * 0.68);

    // progress bar under the whole pill
    const progBarX = barX + 24 * SCALE;
    const progBarW = barW - 48 * SCALE;
    const progBarY = barY + barH + 18 * SCALE;
    roundRect(ctx, progBarX, progBarY, progBarW, 6 * SCALE, 3 * SCALE);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();
    roundRect(ctx, progBarX, progBarY, progBarW * (progressPct / 100), 6 * SCALE, 3 * SCALE);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${14 * SCALE}px InterRegular, sans-serif`;
    ctx.fillText(currentTime, progBarX, progBarY + 28 * SCALE);
    const durW = ctx.measureText(duration).width;
    ctx.fillText(duration, progBarX + progBarW - durW, progBarY + 28 * SCALE);

    const buffer = await canvas.encode('png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate image', details: err.message });
  }
};

// --- icon helpers ---
function drawPlay(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.6, cy - size);
  ctx.lineTo(cx - size * 0.6, cy + size);
  ctx.lineTo(cx + size, cy);
  ctx.closePath();
  ctx.fill();
}

function drawPause(ctx, cx, cy, size) {
  const w = size * 0.5;
  roundRect(ctx, cx - size * 0.9, cy - size, w, size * 2, 3);
  ctx.fill();
  roundRect(ctx, cx + size * 0.4, cy - size, w, size * 2, 3);
  ctx.fill();
}

function drawSkip(ctx, cx, cy, size, isPrev) {
  const dir = isPrev ? -1 : 1;
  for (let i = 0; i < 2; i++) {
    const offset = i * size * 1.1 * dir;
    ctx.beginPath();
    if (isPrev) {
      ctx.moveTo(cx + size * 0.6 + offset, cy - size);
      ctx.lineTo(cx + size * 0.6 + offset, cy + size);
      ctx.lineTo(cx - size * 0.4 + offset, cy);
    } else {
      ctx.moveTo(cx - size * 0.6 + offset, cy - size);
      ctx.lineTo(cx - size * 0.6 + offset, cy + size);
      ctx.lineTo(cx + size * 0.4 + offset, cy);
    }
    ctx.closePath();
    ctx.fill();
  }
}
