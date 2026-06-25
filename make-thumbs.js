const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

const colors = ['#e63946', '#2a9d8f', '#264653', '#f4a261', '#9b5de5'];
const names = ['Stranger Things', 'The Witcher', 'Inception', 'Breaking Bad', 'Dune'];

colors.forEach((c, i) => {
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, 600, 600);
  ctx.fillStyle = '#fff';
  ctx.font = '40px sans-serif';
  ctx.fillText(names[i], 30, 300);
  fs.writeFileSync(`/home/claude/queue-card-generator/test/thumb${i}.png`, canvas.toBuffer('image/png'));
});
console.log('done');
