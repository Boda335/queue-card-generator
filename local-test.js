const handler = require('../api/queue');
const fs = require('fs');

const items = [
  { name: 'Stranger Things', thumbnail: '/home/claude/queue-card-generator/test/thumb0.png', uploader: { name: 'Netflix' } },
  { name: 'The Witcher', thumbnail: '/home/claude/queue-card-generator/test/thumb1.png', uploader: { name: 'Netflix' } },
  { name: 'Inception', thumbnail: '/home/claude/queue-card-generator/test/thumb2.png', uploader: { name: 'Warner Bros' } },
  { name: 'Breaking Bad', thumbnail: '/home/claude/queue-card-generator/test/thumb3.png', uploader: { name: 'AMC' } },
  { name: 'Dune', thumbnail: '/home/claude/queue-card-generator/test/thumb4.png', uploader: { name: 'Warner Bros' } },
];

const req = {
  query: {
    items: JSON.stringify(items),
    currentIndex: '2',
    progress: '42',
    currentTime: '38:12',
    duration: '1:28:00',
    volume: '80',
    paused: 'false',
    scale: '2',
  },
};

const res = {
  setHeader: () => {},
  status(code) {
    this._status = code;
    return this;
  },
  send(buf) {
    fs.writeFileSync('/home/claude/queue-card-generator/test/output.png', buf);
    console.log('Saved test/output.png, status', this._status);
  },
  json(obj) {
    console.error('ERROR RESPONSE', this._status, obj);
  },
};

handler(req, res);
