/* Rishi's party backend: one shared scoreboard + private RSVPs.
   KV namespace binding: DB. Secret: HOST_KEY (your private key for /host). */
const ORIGINS = ['https://vivekbydesign.github.io', 'http://localhost:8080', 'http://127.0.0.1:8080'];
const cors = req => { const o = req.headers.get('Origin'); return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' }; };
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const int = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const body = async req => { try { return JSON.parse(await req.text()); } catch (e) { return null; } };
const getScores = async env => (await env.DB.get('scores', 'json')) || [];

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });

    if (path === '/scores' && req.method === 'GET') {
      const list = await getScores(env);
      return json(req, list.slice(0, 30).map(({ name, t }) => ({ name, t })));
    }
    if (path === '/scores' && req.method === 'POST') {
      const b = await body(req); if (!b) return json(req, { error: 'bad json' }, 400);
      const name = str(b.name, 20), t = +b.t;
      if (!name || !(t >= 5 && t <= 3600)) return json(req, { error: 'invalid' }, 400);
      const list = await getScores(env), i = list.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
      let best = true;
      if (i >= 0) { if (list[i].t <= t) best = false; else list[i] = { name, t, at: Date.now() }; } else list.push({ name, t, at: Date.now() });
      list.sort((a, b) => a.t - b.t); const kept = list.slice(0, 200);
      await env.DB.put('scores', JSON.stringify(kept));
      return json(req, { best, rank: kept.findIndex(s => s.name.toLowerCase() === name.toLowerCase()) + 1, total: kept.length });
    }
    if (path === '/rsvp' && req.method === 'POST') {
      const b = await body(req); if (!b) return json(req, { error: 'bad json' }, 400);
      const id = str(b.id, 16).replace(/[^a-z0-9]/gi, ''), name = str(b.name, 40);
      if (!id || !name) return json(req, { error: 'invalid' }, 400);
      const yes = b.go === 'yes';
      const r = { id, name, go: yes ? 'yes' : 'no', a: yes ? int(b.a, 1, 10) : 0, k: yes ? int(b.k, 0, 10) : 0, note: yes ? '' : str(b.note, 140), at: Date.now() };
      await env.DB.put('rsvp:' + id, JSON.stringify(r));
      return json(req, { ok: true });
    }
    if ((path === '/host' || path === '/rsvps') && req.method === 'GET') {
      if (!env.HOST_KEY || url.searchParams.get('key') !== env.HOST_KEY) return new Response('Not found', { status: 404 });
      const keys = []; let cursor;
      do { const r = await env.DB.list({ prefix: 'rsvp:', cursor }); keys.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor);
      const all = (await Promise.all(keys.map(k => env.DB.get(k.name, 'json')))).filter(Boolean).sort((a, b) => b.at - a.at);
      if (path === '/rsvps') return json(req, all);
      return new Response(hostPage(all), { headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    return new Response('Not found', { status: 404 });
  }
};

function hostPage(all) {
  const yes = all.filter(r => r.go === 'yes'), no = all.filter(r => r.go === 'no');
  const A = yes.reduce((s, r) => s + r.a, 0), K = yes.reduce((s, r) => s + r.k, 0);
  const when = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const row = r => `<tr class="${r.go}"><td>${esc(r.name)}</td><td>${r.go === 'yes' ? 'Coming' : 'Can’t make it'}</td><td>${r.go === 'yes' ? r.a : ''}</td><td>${r.go === 'yes' ? r.k : ''}</td><td>${esc(r.note || '')}</td><td class="t">${when(r.at)}</td></tr>`;
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Rishi’s RSVPs</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>body{margin:0;padding:24px 16px 40px;font-family:Fredoka,system-ui,sans-serif;color:#1c1b17;background:#fff;max-width:760px;margin-inline:auto}
h1{font-size:28px;margin:0 0 4px}.sub{font-family:'Patrick Hand',cursive;font-size:20px;letter-spacing:.06em;text-transform:uppercase;color:#6b675c;margin:0 0 20px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 24px}.stat{border:2px solid #1c1b17;border-radius:16px;padding:12px;text-align:center}.stat b{display:block;font-size:34px;color:#1f7a2e;font-variant-numeric:tabular-nums}.stat span{font-size:14px;color:#6b675c}
table{width:100%;border-collapse:collapse;font-size:15px}th{text-align:left;font-weight:600;color:#6b675c;font-size:13px;padding:8px 6px;border-bottom:2px solid #1c1b17}td{padding:10px 6px;border-bottom:1px solid #ece8de;vertical-align:top}tr.no td{color:#8d8a80}.t{white-space:nowrap;color:#8d8a80;font-size:13px}
.empty{font-family:'Patrick Hand',cursive;font-size:22px;color:#6b675c;text-align:center;padding:40px 0}</style>
<h1>Rishi’s RSVPs</h1><p class="sub">Sunday, Nov 22 · 3 PM</p>
<div class="stats"><div class="stat"><b>${A}</b><span>grown-ups</span></div><div class="stat"><b>${K}</b><span>little ones</span></div><div class="stat"><b>${no.length}</b><span>can’t make it</span></div></div>
${all.length ? `<table><thead><tr><th>Name</th><th>Reply</th><th>Adults</th><th>Kids</th><th>Note</th><th>When</th></tr></thead><tbody>${all.map(row).join('')}</tbody></table>` : '<p class="empty">No replies yet</p>'}`;
}
