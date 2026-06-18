const assert = require('assert');
const { getCategory, isRace, formatTime, formatPace } = require('./fetch-races.js');

// getCategory
assert.strictEqual(getCategory(5000),  '5k',       '5k exact');
assert.strictEqual(getCategory(4600),  '5k',       '5k -8%');
assert.strictEqual(getCategory(5400),  '5k',       '5k +8%');
assert.strictEqual(getCategory(10000), '10k',      '10k exact');
assert.strictEqual(getCategory(9200),  '10k',      '10k -8%');
assert.strictEqual(getCategory(21097), 'half',     'half exact');
assert.strictEqual(getCategory(21515), 'half',     'half +2% (Oakland)');
assert.strictEqual(getCategory(42195), 'marathon', 'marathon exact');
assert.strictEqual(getCategory(8000),  null,       '8k — not a race distance');
assert.strictEqual(getCategory(15000), null,       '15k — not a race distance');

// isRace — keyword match (distance doesn't matter)
assert.strictEqual(isRace({ name: 'Oakland Half Marathon', distance: 8000 }), true,  'keyword: marathon');
assert.strictEqual(isRace({ name: 'Solvang Half',          distance: 8000 }), true,  'keyword: half');
assert.strictEqual(isRace({ name: 'City 10k Race',         distance: 8000 }), true,  'keyword: 10k');
assert.strictEqual(isRace({ name: 'HM 2025',               distance: 8000 }), true,  'keyword: hm');
assert.strictEqual(isRace({ name: 'Sunday morning run',    distance: 8000 }), false, 'no keyword, no distance match');

// isRace — keyword-only (distance alone is not sufficient)
assert.strictEqual(isRace({ name: 'Evening jog', distance: 5000  }), false, 'no keyword = not a race');
assert.strictEqual(isRace({ name: 'Long run',    distance: 21097 }), false, 'no keyword = not a race');
assert.strictEqual(isRace({ name: 'Easy run',    distance: 7000  }), false, 'no keyword = not a race');

// formatTime
assert.strictEqual(formatTime(3600), '1:00:00', '1 hour');
assert.strictEqual(formatTime(7530), '2:05:30', '2h 5m 30s');
assert.strictEqual(formatTime(1800), '30:00',   '30 minutes');
assert.strictEqual(formatTime(65),   '1:05',    '1m 5s');
assert.strictEqual(formatTime(600),  '10:00',   '10 minutes');

// formatPace
assert.strictEqual(formatPace(10000, 3600), '6:00', '6:00/km for 10k in 60min');
assert.strictEqual(formatPace(21097, 7530), '5:57', 'half marathon pace');
assert.strictEqual(formatPace(5000,  1500), '5:00', '5k in 25min');

console.log('All tests passed!');
