/* Rishi's party backend on Netlify: one shared scoreboard + private RSVPs.
   Storage: Netlify Blobs (store "rishi"). Env var HOST_KEY = your private key for /api/host. */
import { getStore } from '@netlify/blobs';

const ORIGINS = ['https://vivekbydesign.github.io', 'https://happybirthdayrishi.com', 'https://www.happybirthdayrishi.com', 'http://localhost:8080', 'http://127.0.0.1:8080'];
const cors = req => { const o = req.headers.get('Origin'); return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' }; };
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const int = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const body = async req => { try { const b = JSON.parse(await req.text()); return b && typeof b === 'object' ? b : null; } catch (e) { return null; } };

export default async (req) => {
  const db = getStore({ name: 'rishi', consistency: 'strong' });
  const url = new URL(req.url), path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  const getScores = async () => (await db.get('scores', { type: 'json' })) || [];

  if (path === '/scores' && req.method === 'GET') return json(req, (await getScores()).slice(0, 30).map(({ name, t }) => ({ name, t })));

  if (path === '/scores' && req.method === 'POST') {
    const b = await body(req); if (!b) return json(req, { error: 'bad json' }, 400);
    const name = str(b.name, 20), t = +b.t;
    if (!name || !(t >= 5 && t <= 3600)) return json(req, { error: 'invalid' }, 400);
    const list = await getScores(), same = s => s.name.toLowerCase() === name.toLowerCase(), i = list.findIndex(same);
    let best = true;
    if (i >= 0) { if (list[i].t <= t) best = false; else list[i] = { name, t, at: Date.now() }; } else list.push({ name, t, at: Date.now() });
    list.sort((a, b) => a.t - b.t); const kept = list.slice(0, 200);
    if (best) await db.setJSON('scores', kept);
    return json(req, { best, rank: kept.findIndex(same) + 1, total: kept.length });
  }

  if (path === '/rsvp' && req.method === 'POST') {
    const b = await body(req); if (!b) return json(req, { error: 'bad json' }, 400);
    const id = str(b.id, 16).replace(/[^a-z0-9]/gi, ''), name = str(b.name, 40);
    if (!id || !name) return json(req, { error: 'invalid' }, 400);
    const yes = b.go === 'yes';
    await db.setJSON('rsvp/' + id, { id, name, go: yes ? 'yes' : 'no', a: yes ? int(b.a, 1, 10) : 0, k: yes ? int(b.k, 0, 10) : 0, note: yes ? '' : str(b.note, 140), at: Date.now() });
    return json(req, { ok: true });
  }

  if (path === '/rsvps/clear' && req.method === 'POST') {
    const key = process.env.HOST_KEY;
    if (!key || url.searchParams.get('key') !== key) return new Response('Not found', { status: 404 });
    const { blobs } = await db.list({ prefix: 'rsvp/' });
    await Promise.all(blobs.map(b => db.delete(b.key)));
    return new Response(JSON.stringify({ cleared: blobs.length }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  if ((path === '/host' || path === '/rsvps') && req.method === 'GET') {
    const key = process.env.HOST_KEY;
    if (!key || url.searchParams.get('key') !== key) return new Response('Not found', { status: 404 });
    const { blobs } = await db.list({ prefix: 'rsvp/' });
    const all = (await Promise.all(blobs.map(b => db.get(b.key, { type: 'json' })))).filter(Boolean).sort((a, b) => b.at - a.at);
    if (path === '/rsvps') return json(req, all);
    return new Response(hostPage(all), { headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  return new Response('Not found', { status: 404 });
};

export const config = { path: '/api/*' };

function hostPage(all) {
  const yes = all.filter(r => r.go === 'yes'), no = all.filter(r => r.go === 'no');
  const A = yes.reduce((s, r) => s + r.a, 0), K = yes.reduce((s, r) => s + r.k, 0);
  const when = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const row = r => `<li class="${r.go}"><div class="nm">${esc(r.name)}</div><div class="rp">${r.go === 'yes' ? `Coming · ${r.a} grown-up${r.a === 1 ? '' : 's'}${r.k ? `, ${r.k} little one${r.k === 1 ? '' : 's'}` : ''}` : 'Can’t make it'}</div>${r.note ? `<div class="nt">“${esc(r.note)}”</div>` : ''}<div class="t">${when(r.at)}</div></li>`;
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Rishi’s RSVPs</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>body{margin:0;padding:24px 16px 40px;font-family:Fredoka,system-ui,sans-serif;color:#1c1b17;background:#fff;max-width:760px;margin-inline:auto}
h1{font-size:28px;margin:0 0 4px}.sub{font-family:'Patrick Hand',cursive;font-size:20px;letter-spacing:.06em;text-transform:uppercase;color:#6b675c;margin:0 0 20px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 24px}.stat{border:2px solid #1c1b17;border-radius:16px;padding:12px;text-align:center}.stat b{display:block;font-size:34px;color:#1f7a2e;font-variant-numeric:tabular-nums}.stat span{font-size:14px;color:#6b675c}
ul{list-style:none;margin:0;padding:0;border-top:2px solid #1c1b17}li{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:14px 2px;border-bottom:1px solid #ece8de}.nm{font-weight:600;font-size:18px}.rp{grid-column:1;font-size:15px;color:#1f7a2e}li.no .rp{color:#b0503f}.nt{grid-column:1;font-family:'Patrick Hand',cursive;font-size:18px;color:#6b675c}.t{grid-column:2;grid-row:1;color:#8d8a80;font-size:13px;white-space:nowrap;padding-top:4px}
.empty{font-family:'Patrick Hand',cursive;font-size:22px;color:#6b675c;text-align:center;padding:40px 0}
.top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.more{position:relative}
.dots{width:44px;height:44px;border-radius:50%;border:2px solid #1c1b17;background:#fff;font-size:22px;line-height:1;cursor:pointer;color:#1c1b17}
.menu{position:absolute;right:0;top:52px;min-width:200px;background:#fff;border:2px solid #1c1b17;border-radius:14px;padding:6px;box-shadow:0 10px 30px -10px rgba(0,0,0,.25);display:none;z-index:2}.menu.open{display:block}
.menu button{width:100%;text-align:left;font:500 16px Fredoka,system-ui,sans-serif;color:#b0503f;background:none;border:0;border-radius:10px;padding:12px 12px;cursor:pointer}.menu button:hover{background:#faf3ee}.menu button:disabled{color:#b9b4a7;cursor:default;background:none}
dialog{border:2px solid #1c1b17;border-radius:20px;padding:22px;max-width:320px;font-family:Fredoka,system-ui,sans-serif}dialog::backdrop{background:rgba(28,27,23,.35)}
dialog h2{margin:0 0 6px;font-size:22px}dialog p{margin:0 0 18px;color:#6b675c;font-size:15px;line-height:1.4}.acts{display:flex;gap:10px;justify-content:flex-end}
.acts button{font:600 16px Fredoka,system-ui,sans-serif;border-radius:22px;padding:10px 18px;cursor:pointer;border:2px solid #1c1b17;background:#fff;color:#1c1b17}.acts .del{background:#b0503f;border-color:#b0503f;color:#fff}</style>
<div class="top"><h1>Rishi’s RSVPs</h1><div class="more"><button class="dots" id="dots" aria-label="More options" aria-haspopup="true" aria-expanded="false">⋯</button><div class="menu" id="menu" role="menu"><button role="menuitem" id="clr"${all.length ? '' : ' disabled'}>Clear all RSVPs</button></div></div></div><p class="sub">Sunday, Nov 22 · 11 AM</p>
<div class="stats"><div class="stat"><b>${A}</b><span>grown-ups</span></div><div class="stat"><b>${K}</b><span>little ones</span></div><div class="stat"><b>${no.length}</b><span>can’t make it</span></div></div>
${all.length ? `<ul>${all.map(row).join('')}</ul>` : '<p class="empty">No replies yet</p>'}
<dialog id="dlg"><h2>Clear all RSVPs?</h2><p>This deletes all ${all.length} repl${all.length === 1 ? 'y' : 'ies'}. You can’t undo this.</p><div class="acts"><button id="no">Cancel</button><button class="del" id="yes">Delete all</button></div></dialog>
<script>
const $=id=>document.getElementById(id), menu=$('menu'), dots=$('dots');
dots.onclick=e=>{e.stopPropagation();const o=menu.classList.toggle('open');dots.setAttribute('aria-expanded',o)};
document.onclick=()=>{menu.classList.remove('open');dots.setAttribute('aria-expanded',false)};
$('clr').onclick=()=>$('dlg').showModal();
$('no').onclick=()=>$('dlg').close();
$('yes').onclick=async()=>{const b=$('yes');b.disabled=true;b.textContent='Deleting…';
  const k=new URLSearchParams(location.search).get('key');
  const r=await fetch('/api/rsvps/clear?key='+encodeURIComponent(k),{method:'POST'});
  if(r.ok) location.reload(); else {b.disabled=false;b.textContent='Delete all';alert('Couldn’t clear. Try again.')}};
</script>`;
}
