/* UI: sheets, HUD, banners, scores, sound, links */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const card = $('card');
card.classList.add('boot');
const NAME_KEY = 'rishi1.name', SCORE_KEY = 'rishi1.times';
const state = { name: localStorage.getItem(NAME_KEY) || '', lastMs: 0, muted: localStorage.getItem('rishi1.muted') === '1' };

/* links */
const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('2459 NE Daphne St, Issaquah, WA');
$('mapLink').href = MAP; $('mapLink2').href = MAP;
const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rishi//Invite//EN', 'BEGIN:VEVENT', 'UID:rishi-first-birthday-20261122@invite', 'DTSTAMP:20260101T000000Z', 'DTSTART:20261122T230000Z', 'DTEND:20261123T010000Z', "SUMMARY:Rishi's first birthday", 'LOCATION:2459 NE Daphne St\\, Issaquah\\, WA', 'DESCRIPTION:One very hungry little caterpillar is turning one!', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
$('calLink').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);

/* RISHI letters in painted paper */
const LT = [['R', 'green'], ['I', 'orange'], ['S', 'redone'], ['H', 'violet'], ['I', 'blue']];
LT.forEach(([ch, t], i) => { const s = document.createElement('span'); s.textContent = ch; s.style.backgroundImage = `url(assets/tex/${t}.jpg)`; s.style.backgroundPosition = `${i * 37}px ${i * 23}px`; s.style.transform = `rotate(${[-4, 3, -2, 4, -3][i]}deg) translateY(${[0, -2, 1, -1, 2][i]}px)`; $('nameLetters').appendChild(s); });

/* sound */
let ac = null;
const audio = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
const tone = (f, t0, d, type = 'triangle', v = .12) => { const a = audio(); if (!a || state.muted) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t0); g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(v, a.currentTime + t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + d); o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + .05); };
const munch = () => { const a = audio(); if (!a || state.muted) return; for (let i = 0; i < 2; i++) { const len = .07, b = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = b.getChannelData(0); for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 2); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.frequency.value = 1400 + i * 500; f.Q.value = .9; g.gain.value = .45; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + i * .09); } };
const chime = () => { [659, 784, 988].forEach((f, i) => tone(f, i * .08, .5, 'sine', .08)); };
const fanfare = () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .11, .9, 'triangle', .09)); };
const setMute = m => { state.muted = m; localStorage.setItem('rishi1.muted', m ? '1' : '0'); $('muteBtn').classList.toggle('muted', m); $('muteBtn').setAttribute('aria-pressed', m); $('muteBtn').setAttribute('aria-label', m ? 'Sound off' : 'Sound on'); };
setMute(state.muted);
$('muteBtn').onclick = () => setMute(!state.muted);

/* scores */
const fmt = s => s.toFixed(1);
const readScores = () => { try { return (JSON.parse(localStorage.getItem(SCORE_KEY)) || []).filter(s => typeof s.t === 'number'); } catch (e) { return []; } };
const saveScore = (name, t) => {
  const list = readScores(), i = list.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
  let best = true;
  if (i >= 0) { if (list[i].t <= t) best = false; else list[i] = { name, t, at: Date.now() }; } else list.push({ name, t, at: Date.now() });
  list.sort((a, b) => a.t - b.t); localStorage.setItem(SCORE_KEY, JSON.stringify(list.slice(0, 50)));
  if (window.SCORES_ENDPOINT) fetch(window.SCORES_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, t }) }).catch(() => {});
  return { best, rank: list.findIndex(s => s.name.toLowerCase() === name.toLowerCase()) + 1, total: list.length };
};
const loadRemote = async () => { if (!window.SCORES_ENDPOINT) return null; try { const r = await fetch(window.SCORES_ENDPOINT); return await r.json(); } catch (e) { return null; } };
const MEDAL = ['strawberry', 'orange', 'apple'];
const renderBoard = async () => {
  const list = (await loadRemote()) || readScores(), ol = $('board'); ol.textContent = '';
  if (!list.length) { const li = document.createElement('li'); li.className = 'empty'; li.innerHTML = '<img src="assets/f_strawberry.png" alt=""><p></p>'; li.querySelector('p').textContent = 'No one has fed the caterpillar yet. Be the first!'; ol.appendChild(li); return; }
  list.slice(0, 30).forEach((s, i) => {
    const li = document.createElement('li'); if (state.name && s.name.toLowerCase() === state.name.toLowerCase()) li.className = 'me';
    const rk = document.createElement('span'); rk.className = 'rk'; if (i < 3) { const im = document.createElement('img'); im.src = `assets/f_${MEDAL[i]}.png`; im.alt = '#' + (i + 1); rk.appendChild(im); } else rk.textContent = i + 1;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s.name;
    const tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = fmt(s.t) + 's';
    li.append(rk, nm, tm); ol.appendChild(li);
  });
};

/* sheets */
let openSheet = null;
const show = id => { if (openSheet) openSheet.classList.remove('open'); openSheet = id ? $(id) : null; if (openSheet) { openSheet.classList.add('open'); card.classList.add('sheet-open'); if (id === 'introSheet') { if (state.name) $('nameInput').value = state.name; requestAnimationFrame(introCat); } } else card.classList.remove('sheet-open'); };
$('scrim').onclick = () => { if (openSheet && openSheet.id !== 'resultSheet') goInvite(); };
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
if (fine) document.querySelector('.coach-t').textContent = 'Click where you want him to go';
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (openSheet) goInvite(); else if (game && game.mode === 'play') goInvite(); return; }
  if (!game || openSheet || game.mode !== 'hero' || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (/^Arrow/.test(e.key)) { e.preventDefault(); state.name ? startGame() : show('introSheet'); }
});

/* HUD */
const hudFoods = d => { const box = $('dayFood'); box.textContent = ''; const uniq = d.foods.length > 5 ? d.foods : d.foods; uniq.forEach(k => { const im = document.createElement('img'); im.src = CP.foodURL(k); im.alt = ''; im.dataset.k = k; if (d.foods.length > 5) im.style.height = '16px'; box.appendChild(im); }); };
const banner = (day, what, tex, small) => { const b = $('banner'); $('bDay').textContent = day; $('bDay').style.backgroundImage = `url(assets/tex/${tex}.jpg)`; $('bWhat').textContent = what; b.classList.toggle('small', !!small); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
const BW = ['One apple', 'Two pears', 'Three plums', 'Four strawberries', 'Five oranges', 'A feast!', 'One green leaf'];

let game;
const hooks = {
  onDay(i, d) { $('dayName').textContent = d.day; hudFoods(d); banner('On ' + d.day, BW[i], d.tex); chime(); },
  onEat(key, left) { munch(); if (navigator.vibrate) navigator.vibrate(12); const im = [...$('dayFood').querySelectorAll('img:not(.got)')].find(x => x.dataset.k === key); if (im) im.classList.add('got'); },
  onBump() { tone(180, 0, .18, 'square', .05); if (navigator.vibrate) navigator.vibrate(40); const t = $('timer'); t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); },
  onTouch() { $('coach').classList.remove('show'); },
  onSpawn() { tone(1046, 0, .12, 'sine', .05); },
  onHatchStart() { banner('Shh…', 'a little egg lay on a leaf', 'plum', true); },
  onHatch() { tone(880, 0, .12, 'square', .05); tone(1320, .05, .25, 'sine', .07); if (navigator.vibrate) navigator.vibrate(18); banner('Pop!', 'out came a tiny caterpillar', 'apple'); },
  onBite() { munch(); if (navigator.vibrate) navigator.vibrate(10); },
  onAche() { banner('Oh no!', 'A tummy ache…', 'green', true); tone(220, 0, .4, 'sine', .08); tone(196, .25, .5, 'sine', .08); },
  onFinish(secs, bumps) { state.lastTime = secs; state.lastBumps = bumps; banner('Much better!', 'And now for a surprise…', 'leaf', true); },
  onTransform() { card.classList.remove('playing'); card.classList.add('metamorph'); },
  onEmerge() { fanfare(); if (navigator.vibrate) navigator.vibrate([20, 40, 20]); },
  onFly() { card.classList.add('reveal'); card.classList.remove('metamorph'); setTimeout(() => card.classList.remove('reveal'), 3200); },
  onTransformDone() { results(); },
};

const tick = () => { if (game && game.mode === 'play') $('timer').firstChild.nodeValue = fmt(game.score()); requestAnimationFrame(tick); };

function startGame() {
  show(null); $('toast').classList.remove('show'); audio(); card.classList.add('playing');
  $('dayName').textContent = 'Get ready'; $('dayFood').textContent = ''; $('timer').firstChild.nodeValue = '0';
  game.startPlay();
  setTimeout(() => { if (game.mode === 'play' && !game.input.down) $('coach').classList.add('show'); }, 3300);
  setTimeout(() => $('coach').classList.remove('show'), 9000);
}
const flyLater = () => { clearTimeout(state.flyT); state.flyT = setTimeout(() => { if (game.mode === 'rest') game.flyAway(); }, 1700); };
function goInvite() {
  show(null); $('goal').classList.remove('show'); if (game.mode === 'rest') flyLater(); card.classList.remove('playing', 'metamorph'); $('coach').classList.remove('show');
  if (game.mode === 'play' || game.mode === 'transform' || game.mode === 'hatch') game.buildHero(true);
}
function results() {
  const secs = state.lastTime, b = state.lastBumps || 0, r = saveScore(state.name || 'Guest', secs);
  const t = $('toast'); t.textContent = '';
  const big = document.createElement('b'); big.textContent = fmt(secs) + 's';
  const msg = document.createElement('span'); msg.textContent = (r.best ? (r.rank === 1 ? 'Fastest of all!' : `#${r.rank} of ${r.total}`) : `Your best is still #${r.rank}`) + (b ? ` · ${b} bump${b > 1 ? 's' : ''} (+${b * 2}s)` : ' · no bumps');
  t.append(big, msg); t.classList.add('show'); clearTimeout(state.toastT); state.toastT = setTimeout(() => t.classList.remove('show'), 5200);
  $('playBtn').lastChild.nodeValue = 'Play again'; const ic = $('playBtn').querySelector('.btn-ic'); if (ic && ic.tagName === 'IMG') ic.outerHTML = '<svg class="btn-ic replay" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M4 3.8v5h5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  flyLater();
}
const cleanName = v => v.replace(/\s+/g, ' ').trim().slice(0, 20);

/* wiring */
$('playBtn').onclick = () => state.name ? startGame() : show('introSheet');
$('scoresBtn').onclick = () => { renderBoard(); show('scoreSheet'); };
$('skipBtn').onclick = () => goInvite();
$('nameForm').onsubmit = e => { e.preventDefault(); const v = cleanName($('nameInput').value);
  if (!v) { $('nameErr').textContent = 'Type a name so we can put you on the scoreboard.'; $('nameInput').classList.add('bad'); $('nameInput').focus(); return; }
  state.name = v; localStorage.setItem(NAME_KEY, v); $('nameErr').textContent = ''; $('nameInput').classList.remove('bad'); $('nameInput').blur(); startGame(); };
$('nameInput').oninput = () => { $('nameInput').classList.remove('bad'); $('nameErr').textContent = ''; };
$('resNameForm').onsubmit = e => { e.preventDefault(); const v = cleanName($('resName').value); if (!v) { $('resName').focus(); return; } state.name = v; localStorage.setItem(NAME_KEY, v); const r = saveScore(v, state.lastTime); $('resNameForm').classList.add('hidden'); $('resRank').textContent = `Saved! You're #${r.rank} of ${r.total}.`; };
$('resInvite').onclick = () => { show(null); flyLater(); };
$('resAgain').onclick = () => { game.buildHero(false); startGame(); };
$('resScores').onclick = () => { renderBoard(); show('scoreSheet'); };
$('scClose').onclick = $('scBack').onclick = () => goInvite();
$('scPlay').onclick = () => state.name ? startGame() : show('introSheet');
$('quitBtn').onclick = () => goInvite();
$('nameInput').value = state.name;

/* the slab "1": crop the SVG to the glyph's ink so layout lines up with what you see */
function fitOne() {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = '700 600px Arvo';
  const m = g.measureText('1'), L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight, A = m.actualBoundingBoxAscent, D = m.actualBoundingBoxDescent;
  if (!(R + L > 0)) return;
  $('one').setAttribute('viewBox', `${-L} ${-A} ${L + R} ${A + D}`);
  c.width = Math.ceil(L + R); c.height = Math.ceil(A + D); g.font = '700 600px Arvo'; g.fillText('1', L, A);
  const y = Math.round(c.height * .55), row = g.getImageData(0, y, c.width, 1).data; let a = -1, b = -1;
  for (let x = 0; x < c.width; x++) if (row[x * 4 + 3] > 128) { if (a < 0) a = x; b = x; }
  if (a >= 0) CP.oneStem = (a + b) / 2 / c.width;
}

/* welcome caterpillar, same cut-paper art as the game */
function introCat() {
  const cv = $('introCat'), dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth || 300, H = cv.clientHeight || 96;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d');
  const r = 14, n = 7, gap = r * 1.45, fake = { R: r * 1.32, mode: 'card', phase: 0, face: 1, chomp: 0, wig: 0, hdir: 0, faceT: 1, t: 0, blink: 0, near: 0, at: () => [0, 0] };
  const frame = now => {
    if (!openSheet || openSheet.id !== 'introSheet') return;
    const t = now / 1000; fake.t = t; fake.phase = t * 5; fake.blink = (t % 3.4) < .12 ? 1 : 0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const total = gap * n + fake.R * 1.6, x0 = (W - total) / 2 + r, base = H * .6, segs = [];
    for (let i = 0; i < n; i++) { const x = x0 + (n - 1 - i) * gap, k = (n - 1 - i) / n, y = base - Math.max(0, Math.sin(k * Math.PI * 1.6 - t * 3.2)) * r * .9;
      segs.push({ x, y, r, a: 0, ground: y > base - r * .3 }); }
    const hx = x0 + n * gap - gap * .2 + fake.R * .35, hy = base - fake.R * .45 + Math.sin(t * 2.2) * 1.5;
    try { CP.Game.prototype.drawCaterpillar.call(fake, g, segs, 1, [hx, hy]); } catch (e) { console.error(e); return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* boot */
(async () => {
  if (/[?&]reset=1/.test(location.search)) { [NAME_KEY, SCORE_KEY, 'rishi1.points', 'rishi1.scores', 'rishi1.muted'].forEach(k => localStorage.removeItem(k)); history.replaceState(null, '', location.pathname); location.reload(); return; }
  try { await Promise.all([CP.loadAll(), document.fonts ? document.fonts.load('700 100px Arvo').then(() => document.fonts.ready) : 0]); }
  catch (e) { console.error(e); }
  CP.buildSegments(); CP.buildFoods(); CP.buildCocoon(); CP.buildEgg();
  fitOne();
  // every fruit in the row has the caterpillar's hole, like the book
  document.querySelectorAll('.foodrow img').forEach(im => { const k = im.src.match(/f_(\w+)\.png/)[1], f = CP.FOOD[k]; if (f && f.eaten !== f.img) im.src = f.eaten.toDataURL('image/png'); });
  card.classList.remove('boot'); card.classList.add('ready');
  await new Promise(r => setTimeout(r, 60));
  game = window.__game = new CP.Game($('cv'), card, hooks);
  game.buildHero(true); tick();
  const q = location.search;
  if (/[?&]auto=1/.test(q)) { state.name = state.name || 'Robo'; setTimeout(startGame, 500); return; }
  if (/[?&]state=scores/.test(q)) { renderBoard(); show('scoreSheet'); return; }
  if (/[?&]state=rest/.test(q)) { game.setRest(); flyLater(); return; }
  setTimeout(() => { if (!openSheet && game.mode === 'hero') show('introSheet'); }, 60);
})();
})();
