/* UI: sheets, HUD, banners, scores, sound, links */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const card = $('card');
card.classList.add('boot');
const NAME_KEY = 'rishi1.name', SCORE_KEY = 'rishi1.times';
const state = { cdTok: 0, dbTok: 0, name: localStorage.getItem(NAME_KEY) || '', lastMs: 0, muted: localStorage.getItem('rishi1.muted') === '1' };

/* links */
const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('2459 NE Daphne St, Issaquah, WA');
$('mapLink').href = MAP; $('mapLink2').href = MAP;
// a real .ics file opens the Add to Calendar sheet on iPhone; Android goes straight to Google Calendar
if (/android/i.test(navigator.userAgent)) { const cl = $('calLink'); cl.removeAttribute('download'); cl.target = '_blank'; cl.rel = 'noopener'; cl.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&' + new URLSearchParams({ text: "Rishi's first birthday", dates: '20261122T190000Z/20261122T210000Z', location: '2459 NE Daphne St, Issaquah, WA', details: 'One very hungry little caterpillar is turning one! https://happybirthdayrishi.com' }); }
else { $('calLink').removeAttribute('download'); $('calLink').href = 'rishi.ics'; }

/* RISHI letters in painted paper */
const LT = [['R', 'green'], ['I', 'orange'], ['S', 'redone'], ['H', 'violet'], ['I', 'blue']];
LT.forEach(([ch, t], i) => { const s = document.createElement('span'); s.textContent = ch; s.style.backgroundImage = `url(assets/tex/${t}.jpg)`; s.style.backgroundPosition = `${i * 37}px ${i * 23}px`; s.style.transform = `rotate(${[-4, 3, -2, 4, -3][i]}deg) translateY(${[0, -2, 1, -1, 2][i]}px)`; $('nameLetters').appendChild(s); });

/* sound */
let ac = null;
const audio = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
const tone = (f, t0, d, type = 'triangle', v = .12) => { const a = audio(); if (!a || state.muted) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t0); g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(v, a.currentTime + t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + d); o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + .05); };
/* chew: soft jaw thock + crunchy paper bite, three chomps that taper off */
const noise = (a, len) => { const b = a.createBuffer(1, Math.max(1, a.sampleRate * len | 0), a.sampleRate), d = b.getChannelData(0); for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; };
const chomp = (a, t, v, bright) => {
  const n = noise(a, .09), f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(bright * (.85 + Math.random() * .3), t); f.frequency.exponentialRampToValueAtTime(bright * .45, t + .07);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .08);
  n.connect(f).connect(g).connect(a.destination); n.start(t); n.stop(t + .1);
  const o = a.createOscillator(), og = a.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(150 + Math.random() * 30, t); o.frequency.exponentialRampToValueAtTime(70, t + .06);
  og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(v * .7, t + .006); og.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(og).connect(a.destination); o.start(t); o.stop(t + .09);
};
/* chomp: the recorded bite; the synth chew is only a fallback until it loads */
let chompBuf = null, chompLoading = false;
const loadChomp = a => { if (chompBuf || chompLoading || !a) return; chompLoading = true; fetch('assets/chomp.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => a.decodeAudioData(b, ok, no))).then(b => { chompBuf = b; }).catch(() => { chompLoading = false; }); };
const munch = (leaf) => { const a = audio(); if (!a || state.muted) return; loadChomp(a); const t = a.currentTime + .01;
  if (chompBuf) { const s = a.createBufferSource(), g = a.createGain(); s.buffer = chompBuf; s.playbackRate.value = (leaf ? 1.12 : 1) * (.95 + Math.random() * .1); g.gain.value = leaf ? .15 : .21; s.connect(g).connect(a.destination); s.start(t); return; }
  const n = leaf ? 2 : 3, br = leaf ? 2600 : 1700; for (let i = 0; i < n; i++) chomp(a, t + i * (.13 + Math.random() * .03), (leaf ? .05 : .065) * (1 - i * .22), br); };
/* butterfly: rising glass sparkle over a breathy wing-flutter, with a soft echo tail */
const shimmer = () => {
  const a = audio(); if (!a || state.muted) return; const t = a.currentTime + .02;
  const out = a.createGain(), dl = a.createDelay(), fb = a.createGain(), wet = a.createGain(); out.gain.value = 1; dl.delayTime.value = .19; fb.gain.value = .38; wet.gain.value = .35;
  out.connect(a.destination); out.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(a.destination);
  const notes = [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637, 3136, 3520];
  notes.forEach((f, i) => { const at = t + i * .075 + Math.random() * .015; [0, 7].forEach(dt => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; o.detune.value = dt; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.035 * (1 - i * .05), at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + .9); o.connect(g).connect(out); o.start(at); o.stop(at + 1); }); });
  const n = noise(a, 1.6), hp = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
  hp.type = 'bandpass'; hp.Q.value = .7; hp.frequency.setValueAtTime(1200, t); hp.frequency.exponentialRampToValueAtTime(6000, t + 1.2);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .5); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
  lfo.frequency.value = 9; lg.gain.value = .03; lfo.connect(lg).connect(g.gain);
  n.connect(hp).connect(g).connect(out); n.start(t); n.stop(t + 1.65); lfo.start(t); lfo.stop(t + 1.65);
};
/* wall bump: a soft sad-trombone "wah wah wah waaah" */
let wahBuf = null, wahLoading = false;
const loadWah = a => { if (wahBuf || wahLoading || !a) return; wahLoading = true; fetch('assets/trombone.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => a.decodeAudioData(b, ok, no))).then(b => { wahBuf = b; }).catch(() => { wahLoading = false; }); };
const wop = () => { const a = audio(); if (!a || state.muted) return; loadWah(a);
  if (wahBuf) { const s = a.createBufferSource(), g = a.createGain(); s.buffer = wahBuf; g.gain.value = .25; s.connect(g).connect(a.destination); s.start(a.currentTime + .02); return; }
  const t0 = a.currentTime + .05, lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 4; lp.connect(a.destination);
  [[392, 0, .26], [370, .3, .26], [349, .6, .26], [330, .9, .95]].forEach(([f, s, d], i) => { const o = a.createOscillator(), g = a.createGain(), t = t0 + s; o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    if (i === 3) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(9, t + .3); l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + d); o.frequency.linearRampToValueAtTime(f * .94, t + d); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.055, t + .05); g.gain.setValueAtTime(.055, t + d * .7); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(lp); o.start(t); o.stop(t + d + .05); }); };
const chime = () => { [659, 784, 988].forEach((f, i) => tone(f, i * .08, .5, 'sine', .08)); };
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
  return { best, rank: list.findIndex(s => s.name.toLowerCase() === name.toLowerCase()) + 1, total: list.length };
};
const API = (window.API || '').replace(/\/+$/, '');
const post = (path, data) => API ? fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data) }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null);
const within = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
// local copy answers instantly; the shared board (when API is set) is the source of truth
const saveScoreAll = async (name, t) => { const local = saveScore(name, t); const remote = await within(post('/scores', { name, t }), 2500); loadRemote(); return remote && remote.rank ? remote : local; };
// the shared board is fetched early and kept in localStorage so the sheet opens with everyone already there
const BOARD_KEY = 'rishi1.board';
const cachedBoard = () => { try { const l = JSON.parse(localStorage.getItem(BOARD_KEY)); return Array.isArray(l) ? l : null; } catch (e) { return null; } };
const mergeMine = list => { const mine = readScores(); if (!mine.length) return list; const m = new Map(list.map(s => [s.name.toLowerCase(), s])); mine.forEach(s => { const k = s.name.toLowerCase(), o = m.get(k); if (!o || s.t < o.t) m.set(k, s); }); return [...m.values()].sort((a, b) => a.t - b.t); };
let remoteP = null;
const loadRemote = () => { if (!API) return Promise.resolve(null); if (remoteP) return remoteP;
  remoteP = (async () => { try { const r = await within(fetch(API + '/scores', { cache: 'no-store' }), 4000); const l = r && r.ok ? await r.json() : null; if (Array.isArray(l)) localStorage.setItem(BOARD_KEY, JSON.stringify(l)); return l; } catch (e) { return null; } finally { setTimeout(() => { remoteP = null; }, 1500); } })();
  return remoteP; };
const MEDAL = ['strawberry', 'orange', 'apple'];
const renderBoard = async () => { const c = cachedBoard(); paintBoard(c ? mergeMine(c) : readScores()); const remote = await loadRemote(); if (remote && openSheet && openSheet.id === 'scoreSheet') paintBoard(remote); };
const paintBoard = list => {
  const ol = $('board'); ol.textContent = '';
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
let openSheet = $('introSheet');
const show = id => { card.classList.toggle('intro-open', id === 'introSheet'); if (openSheet) openSheet.classList.remove('open'); openSheet = id ? $(id) : null; if (openSheet) { openSheet.classList.add('open'); card.classList.add('sheet-open'); if (id === 'introSheet') { if (state.name) $('nameInput').value = state.name; requestAnimationFrame(introCat); requestAnimationFrame(scatterDots); } } else card.classList.remove('sheet-open'); };
$('scrim').onclick = () => { if (openSheet && openSheet.id !== 'resultSheet') goInvite(); };
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const COACH = fine ? ['Arrow keys to move, avoid the edges', 'Arrow keys to move, avoid the edges'] : ['Swipe to move, avoid the edges', 'Swipe to move, avoid the edges'];
const coach = (i, on) => { const t = document.querySelector('.coach-t'); if (t.dataset.txt !== COACH[i]) { t.dataset.txt = COACH[i]; t.setAttribute('aria-label', COACH[i]); t.innerHTML = [...COACH[i]].map((c, k) => `<span aria-hidden="true" style="--k:${k}">${c === ' ' ? '&nbsp;' : c}</span>`).join(''); } $('coach').classList.toggle('show', on); };
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (openSheet) goInvite(); else if (game && (game.mode === 'play' || game.mode === 'over')) goInvite(); return; }
  if (!game || openSheet || game.mode !== 'hero' || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (/^Arrow/.test(e.key)) { e.preventDefault(); state.name ? startGame() : show('introSheet'); }
});

/* HUD */
const hudFoods = d => { const box = $('dayFood'); box.textContent = ''; const uniq = d.foods.length > 5 ? d.foods : d.foods; uniq.forEach(k => { const im = document.createElement('img'); im.src = CP.foodURL(k); im.alt = ''; im.dataset.k = k; if (d.foods.length > 5) im.style.height = '16px'; box.appendChild(im); }); };
const banner = (day, what, tex, small) => {
  const b = $('banner'), set = () => { $('bDay').textContent = day; $('bDay').style.backgroundImage = `url(assets/tex/${tex}.jpg)`; $('bWhat').textContent = what; b.classList.toggle('small', !!small); };
  clearTimeout(state.banT);
  // a held message hands over to the next one in place: words blur out and back in, the banner never vanishes
  if (b.classList.contains('hold') && small !== 'hold') { b.classList.add('swapping'); state.banT = setTimeout(() => { set(); b.classList.remove('show', 'hold', 'slow'); b.classList.add('stay'); void b.offsetWidth; b.classList.remove('swapping'); }, 260); return; }
  set(); b.classList.remove('show', 'stay', 'swapping', 'hold'); b.classList.toggle('slow', small === 'slow'); void b.offsetWidth; b.classList.add('show'); if (small === 'hold') b.classList.add('hold');
};
const bannerOff = () => { ++state.dbTok; $('dayBub').classList.remove('on'); document.querySelector('.daypill').style.visibility = ''; $('dayBub').getAnimations({ subtree: true }).forEach(a => a.cancel()); clearTimeout(state.banT); $('banner').classList.remove('show', 'stay', 'swapping', 'hold'); };
const BW = ['One apple', 'Two pears', 'Three plums', 'Four strawberries', 'Five oranges', 'A feast!', 'One green leaf'];

// vibrate on Android; iOS Safari (18+) has no vibrate, but toggling a hidden switch plays a system haptic
const haptic = (pattern, taps = 1) => { if (navigator.vibrate) { navigator.vibrate(pattern); return; } const l = $('hapt'); if (!l) return; for (let i = 0; i < taps; i++) setTimeout(() => { try { l.click(); } catch (e) {} }, i * 110); };

const cdShow = (txt, tex, go) => { const cd = $('countdown'), num = $('cdNum'); num.textContent = txt; num.style.backgroundImage = `url(assets/tex/${tex}.jpg)`; cd.classList.add('show'); cd.classList.toggle('go', go); num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); };
const goFlash = () => { const tok = ++state.cdTok; cdShow('Go!', 'blue', true); tone(1318, 0, .7, 'sine', .14); tone(1976, .01, .55, 'sine', .05); if (navigator.vibrate) navigator.vibrate(20); setTimeout(() => tok === state.cdTok && $('countdown').classList.remove('show'), 700); };
// the day pill grows into a bubble announcing the day, then folds back into the pill
const dayBubble = (day, what, tex, foods) => {
  const bub = $('dayBub'), pill = document.querySelector('.daypill'), [dEl, wEl, fEl] = bub.children;
  bub.getAnimations({ subtree: true }).forEach(a => { a.onfinish = a.oncancel = null; a.cancel(); });
  const tok = ++state.dbTok;
  dEl.textContent = day; dEl.style.backgroundImage = `url(assets/tex/${tex}.jpg)`; wEl.textContent = what; fEl.textContent = '';
  foods.forEach(k => { const im = document.createElement('img'); im.src = CP.foodURL(k); im.alt = ''; if (foods.length > 5) im.style.height = '17px'; fEl.appendChild(im); });
  bub.style.width = bub.style.height = ''; bub.classList.add('on');
  const r = bub.getBoundingClientRect(), p = pill.getBoundingClientRect(), D = 1900;
  const S = { width: p.width + 'px', height: p.height + 'px', borderRadius: '22px' }, B = { width: r.width + 'px', height: r.height + 'px', borderRadius: '30px' };
  pill.style.visibility = 'hidden';
  const A = bub.animate([{ ...S, easing: 'cubic-bezier(.2,1.25,.4,1)' }, { ...B, offset: .2 }, { ...B, offset: .78, easing: 'cubic-bezier(.6,0,.3,1)' }, S], { duration: D, fill: 'forwards' });
  [...bub.children].forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(8px) scale(.96)' }, { opacity: 0, offset: .08 + i * .03 }, { opacity: 1, transform: 'none', offset: .24 + i * .03 }, { opacity: 1, transform: 'none', offset: .7 }, { opacity: 0, transform: 'translateY(-6px) scale(.97)', offset: .78 }, { opacity: 0 }].map(k => ({ easing: 'ease-out', ...k })), { duration: D, fill: 'forwards' }));
  const done = () => { if (tok !== state.dbTok) return; bub.classList.remove('on'); pill.style.visibility = ''; };
  A.onfinish = done; A.oncancel = done;
};
let game;
const hooks = {
  onDay(i, d) { $('dayName').textContent = d.day; hudFoods(d); dayBubble('On ' + d.day, BW[i], d.tex, d.foods); chime(); },
  onEat(key, left, grp) { if (grp !== state.munchGrp) { state.munchGrp = grp; munch(); } if (navigator.vibrate) navigator.vibrate(12); const im = [...$('dayFood').querySelectorAll('img:not(.got)')].find(x => x.dataset.k === key); if (im) im.classList.add('got'); },
  onBump() { if (navigator.vibrate) navigator.vibrate(40); const t = $('timer'); t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); },
  onTouch() { $('coach').classList.remove('show'); },
  onRelease() { clearTimeout(state.coachT); },
  onMove() { clearTimeout(state.coachOff); state.coachOff = setTimeout(() => $('coach').classList.remove('show'), 4000); },
  // first swipe starts a 3-2-1; he sets off on "Go!"
  onCountdown(go) {
    const tok = ++state.cdTok;
    [['3', 'red'], ['2', 'orange'], ['1', 'green']].forEach(([txt, tex], i) => setTimeout(() => {
      if (tok !== state.cdTok || game.mode !== 'play') return;
      cdShow(txt, tex, false); tone(880, 0, .14, 'sine', .13); if (navigator.vibrate) navigator.vibrate(8);
    }, i * 700));
    setTimeout(() => { if (tok === state.cdTok && game.mode === 'play') { goFlash(); go(); } }, 2100);
  },
  // swiped before the count finished: cancel it and go now
  onGoNow() { if (game.mode === 'play') goFlash(); },
  onSpawn() {},
  onHatchStart() { banner('One day…', 'a little egg lay on a leaf', 'plum', 'hold'); },
  onHatch() { if (navigator.vibrate) navigator.vibrate(18); tone(1318, 0, .5, 'sine', .1); clearTimeout(state.coachT); state.coachT = setTimeout(() => { if (game.mode === 'play' && game.held) coach(1, true); }, 3100); banner('Pop!', 'out came a tiny caterpillar', 'apple', 'slow'); },
  onBite() { munch(true); if (navigator.vibrate) navigator.vibrate(10); },
  onAche() { banner('Oh no!', 'A tummy ache…', 'green', true); },
  onDecoy() { haptic(25); const sn = $('sweetNote'); sn.classList.remove('show'); void sn.offsetWidth; sn.classList.add('show'); clearTimeout(state.sweetT); state.sweetT = setTimeout(() => sn.classList.remove('show'), 2200); $('coach').classList.remove('show'); if (navigator.vibrate) navigator.vibrate([30, 30, 50]); const t = $('timer'); t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); },
  onFinish(secs, bumps, aches) { state.lastTime = secs; state.lastBumps = bumps; state.lastAches = aches || 0; banner('Much better!', 'He wasn’t hungry anymore', 'leaf', true); },
  onTransform() { card.classList.remove('playing'); card.classList.add('metamorph'); },
  onEmerge() { shimmer(); if (navigator.vibrate) navigator.vibrate([20, 40, 20]); },
  onFly() { card.classList.add('reveal'); card.classList.remove('metamorph'); setTimeout(() => card.classList.remove('reveal'), 3200); },
  onTransformDone() { results(); },
  onWall() { haptic([40, 30, 60], 2); wop(); const t = $('timer'); t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); $('coach').classList.remove('show'); clearTimeout(state.overT); state.overT = setTimeout(() => { if (game.mode === 'over') show('overSheet'); }, 900); },
};

const tick = () => { if (game && game.mode === 'play') $('timer').firstChild.nodeValue = fmt(game.score()); requestAnimationFrame(tick); };

function startGame() {
  show(null); ++state.cdTok; ['toast', 'countdown', 'sweetNote', 'coach', 'goal'].forEach(id => $(id).classList.remove('show')); bannerOff(); loadChomp(audio()); loadWah(audio()); card.classList.add('playing');
  $('dayName').textContent = 'Get ready'; $('dayFood').textContent = ''; $('timer').firstChild.nodeValue = '0';
  game.startPlay();
}
const flyLater = () => { clearTimeout(state.flyT); state.flyT = setTimeout(() => { if (game.mode === 'rest') game.flyAway(); }, 1700); };
function goInvite(skip) {
  ++state.cdTok; $('countdown').classList.remove('show'); bannerOff();
  const fromWelcome = skip && openSheet && openSheet.id === 'introSheet';
  show(null); $('sweetNote').classList.remove('show'); $('goal').classList.remove('show'); if (game.mode === 'rest') flyLater(); card.classList.remove('playing', 'metamorph'); $('coach').classList.remove('show');
  // leaving a run for the invite: the butterfly flutters across the invite, then he crawls back in
  // skipping: a blank page, the butterfly unfolds in the middle, flies off and the invite pans up into view
  if (fromWelcome || ['play', 'over'].includes(game.mode)) { card.classList.remove('ready', 'calm'); card.classList.add('emerging', 'pan'); clearTimeout(state.calmT); clearTimeout(state.panT);
    game.flyBy(true); setTimeout(shimmer, 250); state.calmT = setTimeout(() => card.classList.remove('emerging'), 1900); state.panT = setTimeout(() => card.classList.remove('pan'), 3800); }
  else if (['transform', 'hatch'].includes(game.mode)) game.buildHero(true);
}
async function results() {
  const secs = state.lastTime, r = await saveScoreAll(state.name || 'Guest', secs);
  const t = $('toast'); t.textContent = '';
  const big = document.createElement('b'); big.textContent = fmt(secs) + 's';
  const msg = document.createElement('span'); msg.textContent = (r.best ? (r.rank === 1 ? 'Fastest of all!' : `#${r.rank} of ${r.total}`) : `Your best is still #${r.rank}`);
  t.append(big, msg); t.classList.add('show'); clearTimeout(state.toastT); state.toastT = setTimeout(() => t.classList.remove('show'), 5200);
  paintPlay();
  flyLater();
}
const cleanName = v => v.replace(/\s+/g, ' ').trim().slice(0, 20);

/* rsvp — saved on this phone and sent to the party API (window.API) */
const RSVP_KEY = 'rishi1.rsvp';
const rs = { go: 'yes', a: 1, k: 0 };
const readRsvp = () => { try { return JSON.parse(localStorage.getItem(RSVP_KEY)); } catch (e) { return null; } };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const rsvpSummary = r => r.go === 'yes' ? ['You’re coming!', [plural(r.a, 'grown-up', 'grown-ups'), r.k ? plural(r.k, 'little one', 'little ones') : ''].filter(Boolean).join(', ')] : ['Can’t make it', 'Thanks for telling us'];
const paintRsvp = pop => { const r = readRsvp(), d = $('rsvpDone');
  $('rsvpAsk').classList.toggle('hidden', !!r); d.classList.toggle('hidden', !r);
  if (r) { const [h, sub] = rsvpSummary(r); $('rsvpHead').textContent = h; $('rsvpSum').textContent = sub; d.classList.toggle('no', r.go === 'no'); if (pop) { d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); } } };
const setGo = go => { rs.go = go; $('rsvpSheet').classList.toggle('no', go === 'no');
  document.querySelectorAll('#rsvpSheet .seg button').forEach(b => b.setAttribute('aria-checked', b.dataset.go === go));
  $('rsvpTitle').textContent = go === 'yes' ? 'Yay, see you there!' : "We'll miss you!";
  $('rsvpSub').textContent = go === 'yes' ? 'Sunday, Nov 22 at 11 AM · 2459 NE Daphne St' : "Thanks for letting us know.";
  $('rsvpSend').textContent = go === 'yes' ? 'Send RSVP' : 'Send'; };
const paintCount = () => { $('cA').textContent = rs.a; $('cK').textContent = rs.k;
  document.querySelectorAll('.st-b').forEach(b => { const v = rs[b.dataset.k], d = +b.dataset.d; b.disabled = d < 0 ? v <= (b.dataset.k === 'a' ? 1 : 0) : v >= 10; }); };
const openRsvp = go => { const r = readRsvp();
  if (r) { rs.a = r.a || 1; rs.k = r.k || 0; $('rsvpNote').value = r.note || ''; }
  $('rsvpName').value = (r && r.name) || state.name || ''; $('rsvpErr').textContent = ''; $('rsvpName').classList.remove('bad');
  setGo(go || (r && r.go) || 'yes'); paintCount(); show('rsvpSheet'); };
document.querySelectorAll('[data-rsvp]').forEach(b => b.onclick = () => openRsvp(b.dataset.rsvp));
$('rsvpDone').onclick = () => openRsvp();
document.querySelectorAll('#rsvpSheet .seg button').forEach(b => b.onclick = () => setGo(b.dataset.go));
document.querySelectorAll('.st-b').forEach(b => b.onclick = () => { const k = b.dataset.k; rs[k] = Math.min(10, Math.max(k === 'a' ? 1 : 0, rs[k] + +b.dataset.d)); paintCount(); });
$('rsvpName').oninput = () => { $('rsvpName').classList.remove('bad'); $('rsvpErr').textContent = ''; };
$('rsvpForm').onsubmit = e => { e.preventDefault(); const name = $('rsvpName').value.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name) { $('rsvpErr').textContent = 'Add your name so Rishi knows who’s coming.'; $('rsvpName').classList.add('bad'); $('rsvpName').focus(); return; }
  const r = { id: (readRsvp() || {}).id || Math.random().toString(36).slice(2, 10), go: rs.go, name, a: rs.go === 'yes' ? rs.a : 0, k: rs.go === 'yes' ? rs.k : 0, note: rs.go === 'no' ? $('rsvpNote').value.trim().slice(0, 140) : '', at: Date.now() };
  localStorage.setItem(RSVP_KEY, JSON.stringify(r)); $('rsvpName').blur(); $('rsvpNote').blur();
  post('/rsvp', r);
  show(null); paintRsvp(true);
  if (r.go === 'yes' && navigator.vibrate) navigator.vibrate([12, 40, 12]);
};
paintRsvp();
function paintPlay() { const again = readScores().length > 0; $('playLabel').textContent = again ? 'Play again' : 'Play game'; $('playBtn').setAttribute('aria-label', again ? 'Play the caterpillar game again' : 'Play the caterpillar game'); }
paintPlay();

/* wiring */
$('playBtn').onclick = () => state.name ? startGame() : show('introSheet');
$('scoresBtn').onclick = () => { renderBoard(); show('scoreSheet'); };
$('skipBtn').onclick = () => goInvite(true);
$('nameForm').onsubmit = e => { e.preventDefault(); const v = cleanName($('nameInput').value);
  if (!v) { $('nameErr').textContent = 'Type a name so we can put you on the scoreboard.'; $('nameInput').classList.add('bad'); $('nameInput').focus(); return; }
  state.name = v; localStorage.setItem(NAME_KEY, v); $('nameErr').textContent = ''; $('nameInput').classList.remove('bad'); $('nameInput').blur(); startGame(); };
$('nameInput').oninput = () => { $('nameInput').classList.remove('bad'); $('nameErr').textContent = ''; };
$('resNameForm').onsubmit = async e => { e.preventDefault(); const v = cleanName($('resName').value); if (!v) { $('resName').focus(); return; } state.name = v; localStorage.setItem(NAME_KEY, v); const r = await saveScoreAll(v, state.lastTime); $('resNameForm').classList.add('hidden'); $('resRank').textContent = `Saved! You're #${r.rank} of ${r.total}.`; };
$('resInvite').onclick = () => { show(null); flyLater(); };
$('resAgain').onclick = () => { game.buildHero(false); startGame(); };
$('resScores').onclick = () => { renderBoard(); show('scoreSheet'); };
$('scClose').onclick = $('scBack').onclick = () => goInvite();
// swipe a sheet down to close it
['scoreSheet', 'rsvpSheet', 'overSheet'].forEach(id => {
  const sh = $(id); let y0 = null, dy = 0, t0 = 0;
  sh.addEventListener('touchstart', e => { const sc = e.target.closest('.board'); if (sc && sc.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; t0 = performance.now(); }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 4) { sh.classList.add('dragging'); sh.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); } }, { passive: false });
  sh.addEventListener('touchend', () => { if (y0 === null) return; const v = dy / Math.max(1, performance.now() - t0); y0 = null; sh.classList.remove('dragging'); sh.style.transform = '';
    if (dy > 110 || (dy > 40 && v > .5)) goInvite(); });
});
$('overAgain').onclick = () => startGame();
$('overInvite').onclick = () => goInvite();
$('scPlay').onclick = () => state.name ? startGame() : show('introSheet');
$('quitBtn').onclick = () => goInvite();
$('restartBtn').onclick = () => { if (['play', 'over', 'hatch'].includes(game.mode)) startGame(); };
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

/* welcome dots: painted circles scattered around the page, never over the words */
const DOT_TEX = ['violet', 'blue', 'red', 'green', 'orange', 'yellow', 'teal'];
function scatterDots() {
  const box = $('dots'), sh = $('introSheet'); box.textContent = '';
  const R = sh.getBoundingClientRect(); if (!R.width) return;
  // dots ring the card evenly in a fixed layout (seeded, same every visit); side dots sit off the card and bleed off the screen edge
  const c = sh.querySelector('.intro-card').getBoundingClientRect(), L = c.left - R.left, T = c.top - R.top, Rt = c.right - R.left, B = c.bottom - R.top, W = R.width, H = R.height;
  let seed = 22; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const SIZES = [5, 19, 9, 26, 7, 14, 4, 22, 11, 6, 17, 8, 24, 5, 13, 20, 9], N = SIZES.length, per = 2 * (c.width + c.height), pts = []; let ci = 0;
  for (let i = 0; i < N; i++) {
    const r = SIZES[i], d = ((i + .5 + (rnd() - .5) * .3) / N) * per; let x, y;
    if (d < c.width) { x = L + d; y = T - Math.max(r + 8 + rnd() * Math.max(0, T - 2 * r - 20), r * .4); y = Math.max(y, r + 6); }
    else if (d < c.width + c.height) { y = T + d - c.width; x = Rt + 7 + r; }
    else if (d < 2 * c.width + c.height) { x = Rt - (d - c.width - c.height); y = B + Math.max(r + 8 + rnd() * Math.max(0, H - B - 2 * r - 20), r * .4); y = Math.min(y, H - r - 6); }
    else { y = B - (d - 2 * c.width - c.height); x = L - 7 - r; }
    x = Math.min(Math.max(x, L - 7 - r), Rt + 7 + r); pts.push({ x, y, r });
  }
  pts.sort((a, b) => a.y - b.y).forEach((p, i) => {
    const d = document.createElement('span'); d.className = 'dot';
    Object.assign(d.style, { left: p.x - p.r + 'px', top: p.y - p.r + 'px', width: p.r * 2 + 'px', height: p.r * 2 + 'px', backgroundImage: `url(assets/tex/${DOT_TEX[ci++ % DOT_TEX.length]}.jpg)`, animationDelay: `${.15 + i * .035}s, ${-(i * 1.37 % 6)}s` });
    box.append(d);
  });
}

/* welcome caterpillar, same cut-paper art as the game */
function introCat() {
  const cv = $('introCat'), dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth || 300, H = cv.clientHeight || 96;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d');
  const r = 17, n = 7, gap = r * 1.38, fake = { R: r * 1.1, mode: 'card', phase: 0, face: 1, chomp: 0, wig: 0, hdir: 0, faceT: 1, t: 0, blink: 0, near: 0, at: () => [0, 0] };
  const frame = now => {
    if (!openSheet || openSheet.id !== 'introSheet') return;
    const t = now / 1000; fake.t = t; fake.phase = t * 5; fake.blink = (t % 3.4) < .12 ? 1 : 0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const total = gap * n + fake.R * 1.6, x0 = (W - total) / 2 + r, base = H * .6, segs = [];
    for (let i = 0; i < n; i++) { const x = x0 + (n - 1 - i) * gap, k = (n - 1 - i) / n, y = base - Math.max(0, Math.sin(k * Math.PI * 1.6 - t * 3.2)) * r * .9;
      segs.push({ x, y, r, a: 0, ground: false }); }
    const hx = x0 + n * gap - gap * .2 + fake.R * .35, hy = base - fake.R * .45 + Math.sin(t * 2.2) * 1.5;
    try { CP.Game.prototype.drawCaterpillar.call(fake, g, segs, 1, [hx, hy]); } catch (e) { console.error(e); return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* boot */
(async () => {
  if (/[?&]reset=1/.test(location.search)) { [NAME_KEY, SCORE_KEY, 'rishi1.points', 'rishi1.scores', 'rishi1.muted', 'rishi1.rsvp'].forEach(k => localStorage.removeItem(k)); history.replaceState(null, '', location.pathname); location.reload(); return; }
  try { await Promise.all([CP.loadAll(), document.fonts ? document.fonts.load('700 100px Arvo').then(() => document.fonts.ready) : 0]); }
  catch (e) { console.error(e); }
  CP.buildSegments(); CP.buildFoods(); CP.buildCocoon(); CP.buildEgg();
  fitOne();
  // every fruit in the row has the caterpillar's hole, like the book
  document.querySelectorAll('.foodrow img').forEach(im => { const k = im.src.match(/f_(\w+)\.png/)[1], f = CP.FOOD[k]; if (f && f.eaten !== f.img) im.src = f.eaten.toDataURL('image/png'); });
  loadRemote();
  card.classList.remove('boot'); card.classList.add('ready');
  await new Promise(r => setTimeout(r, 60));
  game = window.__game = new CP.Game($('cv'), card, hooks);
  game.buildHero(true); tick();
  const q = location.search;
  if (/[?&](auto=1|state=)/.test(q)) show(null); else { requestAnimationFrame(introCat); (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(scatterDots)); }
  if (/[?&]auto=1/.test(q)) { state.name = state.name || 'Robo'; setTimeout(startGame, 500); return; }
  if (/[?&]state=scores/.test(q)) { renderBoard(); show('scoreSheet'); return; }
  if (/[?&]state=rest/.test(q)) { game.setRest(); flyLater(); return; }
})();
})();
