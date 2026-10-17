import { MOMENTS, PHASES, ROLES } from '../game/scenario';
import type { ChecklistItem, Consequence, Doc, Moment, Phase } from '../game/types';
import { DEFAULTS, deriveCode, settings, type Person, type Settings } from '../game/settings';

const h = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

export interface Detour { index: number; title: string; steps: string; why: string; days: number; origin?: string }
export interface DebriefData { days: number; ideal: number; detours: Detour[] }

const PHASE_ORDER: Phase[] = ['A', 'B', 'C', 'D', 'E'];

export class UI {
  private hudEl: HTMLElement;
  private statsEl: HTMLElement;
  private stripEl: HTMLElement;
  private deskEl: HTMLElement;
  private toastEl: HTMLElement;
  private menuEl: HTMLElement;

  constructor(private root: HTMLElement) {
    this.hudEl = this.mount('<div id="hud" class="glass hidden"></div>');
    this.statsEl = this.mount(`<div id="stats" class="glass hidden">
      <div class="stat"><span class="stat-n" id="days">0</span><span class="stat-l">game days</span></div>
      <div class="stat"><span class="stat-n bad" id="detours">0</span><span class="stat-l">detours</span></div>
      <button id="menu-btn" aria-label="Menu">☰</button></div>`);
    this.stripEl = this.mount('<div id="strip" class="glass hidden"></div>');
    this.deskEl = this.mount('<div id="desk" class="glass"></div>');
    this.toastEl = this.mount('<div id="toast" class="glass"></div>');
    this.menuEl = this.mount(`<div id="menu" class="glass">
      <button data-go="restart">Restart from the beginning</button>
      <div class="menu-l">Jump to a phase (facilitator)</div>
      ${PHASE_ORDER.map(p => `<button data-go="${p}">${p} · ${PHASES[p]}</button>`).join('')}
      <button data-go="about">About this simulation</button></div>`);
    this.statsEl.querySelector('#menu-btn')!.addEventListener('click', () => this.menuEl.classList.toggle('open'));
    this.menuEl.addEventListener('click', e => {
      const go = (e.target as HTMLElement).dataset.go;
      if (!go) return;
      this.menuEl.classList.remove('open');
      if (go === 'about') { this.about(); return; }
      location.hash = go === 'restart' ? '' : `phase=${go}`;
      location.reload();
    });
  }

  private mount(html: string) { const el = h(html); this.root.appendChild(el); return el; }

  // ---------- title ----------

  title(initial: Settings): Promise<{ mode: 'play' | 'demo'; settings: Settings }> {
    const n = initial.names;
    const el = this.mount(`<div id="title" class="overlay">
      <div class="title-card glass">
        <div class="eyebrow">WHO Global Digital Health Certification Network</div>
        <h1>Join the Network</h1>
        <p class="lede">Take your country from a first email to live on the production Trust Network Gateway, the way the WHO SMART Trust guidance sets it out.</p>
        <div class="setup">
          <label class="f-country">Your country<input id="s-country" maxlength="32" autocomplete="off"></label>
          <label class="f-code">Code<input id="s-code" maxlength="3" autocomplete="off"></label>
        </div>
        <details class="adv"><summary>Advanced: name your team</summary>
          <div class="team">
            <label><span class="avatar r-business">BO</span>Business Owner<input data-p="business"></label>
            <label><span class="avatar r-keymaster">KM</span>Key Master<input data-p="keymaster"></label>
            <label><span class="avatar r-legal">LG</span>Legal<input data-p="legal"></label>
            <label><span class="avatar r-technical">TC</span>Technical<input data-p="technical"></label>
          </div>
          <button class="link reset" type="button">Reset to the sample country (Country XC)</button>
        </details>
        <div class="title-grid">
          <div><span class="dot c-country"></span><b class="t-cname"></b><br>your ministry, your servers, your private keys</div>
          <div><span class="dot c-network"></span><b>Trust Network Gateway</b><br>public keys and trust lists</div>
          <div><span class="dot c-who"></span><b>WHO</b><br>Secretariat, Operations, the offline Trust Anchor</div>
          <div><span class="dot c-github"></span><b>GitHub</b><br>where your public keys wait for tng-bot</div>
        </div>
        <p class="small">Each moment asks your team to make a call. Wrong calls send things back, sometimes much later. Roads matter: <span class="paper">paper travels by email</span>, <span class="data">keys travel by data</span>.</p>
        <div class="title-actions"><button class="primary" id="start">Start onboarding</button><button class="ghost" id="watch-demo">▶ Watch the demo</button></div>
        <p class="fine">Based on WHO SMART Trust (smart.who.int/trust). The sample country and people are fictional. Game days are illustrative, not WHO timelines.</p>
      </div></div>`);
    const $ = <T extends HTMLElement>(q: string) => el.querySelector(q) as T;
    const country = $<HTMLInputElement>('#s-country'), code = $<HTMLInputElement>('#s-code');
    const people = [...el.querySelectorAll<HTMLInputElement>('.team input')];
    let codeTouched = initial.code !== deriveCode(initial.country);
    const fillForm = (s: Settings) => {
      country.value = s.country; code.value = s.code;
      people.forEach(i => { i.value = s.names[i.dataset.p as Person]; });
      $('.t-cname').textContent = s.country;
    };
    fillForm({ ...initial, names: n });
    country.addEventListener('input', () => {
      if (!codeTouched) code.value = deriveCode(country.value);
      $('.t-cname').textContent = country.value || 'Your country';
    });
    code.addEventListener('input', () => {
      codeTouched = true;
      code.value = code.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
    $('.reset').addEventListener('click', () => { codeTouched = false; fillForm(structuredClone(DEFAULTS)); });
    const read = (): Settings => {
      const names = { ...DEFAULTS.names };
      people.forEach(i => { if (i.value.trim()) names[i.dataset.p as Person] = i.value.trim(); });
      const c = country.value.trim() || DEFAULTS.country;
      return { country: c, code: (code.value.trim() || deriveCode(c)).toUpperCase(), names };
    };
    return new Promise(done => {
      const go = (mode: 'play' | 'demo') => {
        el.classList.add('gone');
        setTimeout(() => el.remove(), 500);
        done({ mode, settings: read() });
      };
      $('#start').addEventListener('click', () => go('play'));
      $("#watch-demo").addEventListener('click', () => go('demo'));
    });
  }

  about() {
    const el = this.mount(`<div class="overlay"><div class="title-card glass">
      <h2>About this simulation</h2>
      <p>A learning tool that turns the WHO SMART Trust onboarding process into choices a country team makes. Step numbers refer to the published process at smart.who.int/trust, which remains the authority. The GDHCN Administrative and Operational Framework is authoritative for definitions.</p>
      <p>Simplifications: steps are grouped into moments, some checks are shown at a convenient point in the story, and game days are illustrative.</p>
      <button class="primary">Close</button></div></div>`);
    el.querySelector('button')!.addEventListener('click', () => el.remove());
  }

  showChrome() { for (const e of [this.hudEl, this.statsEl, this.stripEl]) e.classList.remove('hidden'); }

  // ---------- HUD, stats, strip ----------

  hud(m: Moment) {
    const r = ROLES[m.role];
    this.hudEl.innerHTML = `
      <div class="hud-top"><span class="chip phase-${m.phase}">${m.phase} · ${PHASES[m.phase]}</span><span class="chip steps">WHO ${m.steps}</span></div>
      <div class="hud-title">${m.title}</div>
      <div class="hud-role"><span class="avatar r-${m.role}">${r.initials}</span>${m.role === 'who' ? 'WHO does this part' : `${r.name} · ${r.title}`}</div>`;
  }

  stats(days: number, detours: number) {
    this.statsEl.querySelector('#days')!.textContent = String(days);
    this.statsEl.querySelector('#detours')!.textContent = String(detours);
  }

  strip(index: number, detours: Detour[]) {
    this.stripEl.innerHTML = routeSvg(index, detours, false);
  }

  // ---------- desk ----------

  private openDesk(html: string, cls = '') {
    this.deskEl.className = `glass open ${cls}`;
    this.deskEl.innerHTML = html;
    this.deskEl.scrollTop = 0;
  }

  hideDesk() { this.deskEl.className = 'glass'; }

  private header(m: Moment) {
    const r = ROLES[m.role];
    return `<div class="desk-head"><span class="avatar r-${m.role}">${r.initials}</span>
      <div><div class="desk-who">${m.role === 'who' ? 'WHO' : r.name}</div><div class="desk-sub">${m.role === 'who' ? 'Watch what WHO does' : r.title}</div></div>
      <span class="chip steps">WHO ${m.steps}</span></div>
      <h2>${m.title}</h2><p class="brief">${m.brief}</p>
      ${m.docs ? `<div class="docs">${m.docs.map(docHtml).join('')}</div>` : ''}`;
  }

  ask(m: Moment, disabled: Set<string>): Promise<string> {
    const choices = m.choices!.map(c => `<button class="choice" data-id="${c.id}" ${disabled.has(c.id) ? 'disabled' : ''}>${c.text}${disabled.has(c.id) ? '<span class="tried">tried</span>' : ''}</button>`).join('');
    this.openDesk(`${this.header(m)}<div class="prompt">${m.prompt}</div><div class="choices">${shuffle(choices)}</div>`);
    return new Promise(done => {
      this.deskEl.querySelectorAll<HTMLButtonElement>('.choice').forEach(b => b.addEventListener('click', () => done(b.dataset.id!)));
    });
  }

  checklist(m: Moment): Promise<number[]> {
    const items = m.checklist!.items.map((it: ChecklistItem, i: number) =>
      `<label class="check"><input type="checkbox" value="${i}"><span>${it.text}</span></label>`).join('');
    this.openDesk(`${this.header(m)}<div class="prompt">${m.prompt}</div><div class="checks">${items}</div>
      <button class="primary send">Send the Letter to WHO</button>`);
    return new Promise(done => {
      this.deskEl.querySelector('.send')!.addEventListener('click', () => {
        done([...this.deskEl.querySelectorAll<HTMLInputElement>('input:checked')].map(i => Number(i.value)));
      });
    });
  }

  watch(m: Moment): Promise<void> {
    this.openDesk(`${this.header(m)}<div class="prompt">${m.prompt}</div><button class="primary go">Watch</button>`);
    return new Promise(done => this.deskEl.querySelector('.go')!.addEventListener('click', () => done()));
  }

  returned(c: Consequence, opts: { fix?: string; extra?: string[]; origin?: string } = {}): Promise<void> {
    this.openDesk(`<div class="ret-head"><span class="ret-icon">!</span><div><div class="ret-by">Returned by ${c.by}</div><div class="desk-sub">WHO ${c.steps}</div></div><span class="chip bad">+${c.days} days</span></div>
      <h2>${c.title}</h2>
      ${opts.origin ? `<p class="origin">This goes back to an earlier call: <b>${opts.origin}</b>. It looked fine at the time.</p>` : ''}
      <p><b>What happened.</b> ${c.what}</p>
      ${opts.extra?.length ? `<ul class="extra">${opts.extra.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
      ${c.why ? `<p><b>Why.</b> ${c.why}</p>` : ''}
      ${opts.fix ? `<p class="fix"><b>The fix.</b> ${opts.fix}</p>` : ''}
      <button class="primary go">${opts.fix ? 'Fix it and resend' : 'Try again'}</button>`, 'returned');
    return new Promise(done => this.deskEl.querySelector('.go')!.addEventListener('click', () => { this.hideDesk(); done(); }));
  }

  toast(html: string, tone: 'ok' | 'info' | 'bad' = 'ok', ms = 3200) {
    this.toastEl.className = `glass show t-${tone}`;
    this.toastEl.innerHTML = html;
    clearTimeout((this.toastEl as any)._t);
    (this.toastEl as any)._t = setTimeout(() => { this.toastEl.className = 'glass'; }, ms);
  }

  // ---------- debrief ----------

  debrief(d: DebriefData): Promise<void> {
    const lostDays = d.detours.reduce((s, x) => s + x.days, 0);
    const el = this.mount(`<div id="debrief" class="overlay"><div class="debrief-card glass">
      <div class="eyebrow">Debrief · ${settings().country} is live</div>
      <h1>${d.detours.length ? `Live, with ${d.detours.length} detour${d.detours.length > 1 ? 's' : ''}` : 'Live, first time'}</h1>
      <div class="kpis">
        <div><span>${d.days}</span>game days</div>
        <div><span>${d.ideal}</span>ideal route</div>
        <div><span class="bad">+${lostDays}</span>days on detours</div>
      </div>
      <h3>Your route</h3>
      <div class="route">${routeSvg(MOMENTS.length, d.detours, true)}</div>
      ${d.detours.length ? `<h3>What sent things back</h3><ol class="detours">${d.detours.map(x =>
        `<li><b>${x.title}</b> <span class="chip steps">WHO ${x.steps}</span> <span class="chip bad">+${x.days}</span><br>${x.why}${x.origin ? `<br><span class="origin-l">Decision made earlier, at: ${x.origin}</span>` : ''}</li>`).join('')}</ol>` : ''}
      <h3>Where the keys live</h3>
      <div class="keys">
        <div class="k-col c-country"><b>${settings().country} keeps</b><ul><li>SCA private key, offline in the vault</li><li>TLS and Upload private keys</li><li>Document Signer private keys</li></ul></div>
        <div class="k-col c-github"><b>GitHub carries</b><ul><li>Public keys only (PEM)</li><li>A GPG-signed tag</li><li>Read by tng-bot-dev (UAT) and tng-bot (PROD)</li></ul></div>
        <div class="k-col c-who"><b>WHO holds</b><ul><li>The Trust Anchor, offline and air-gapped</li><li>Your verified people and GPG keys</li></ul></div>
        <div class="k-col c-network"><b>The Gateway publishes</b><ul><li>Whitelisted public keys</li><li>Trust lists for every participant</li></ul></div>
      </div>
      <h3>What to take back to your team</h3>
      <ol class="learn">${MOMENTS.filter(m => m.learn).map(m => `<li>${m.learn}</li>`).join('')}</ol>
      <div class="debrief-actions"><button class="primary again">Play again</button><button class="ghost print">Print this debrief</button></div>
    </div></div>`);
    el.querySelector('.print')!.addEventListener('click', () => window.print());
    return new Promise(done => el.querySelector('.again')!.addEventListener('click', () => { el.remove(); done(); }));
  }
}

// ---------- helpers ----------

function shuffle(html: string) {
  const t = document.createElement('div'); t.innerHTML = html;
  const kids = [...t.children];
  for (let i = kids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kids[i], kids[j]] = [kids[j], kids[i]]; }
  return kids.map(k => k.outerHTML).join('');
}

const GAUGE = '<svg class="dash-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2.5"/><path d="M6 13l3-3 3 2 5-5"/><path d="M8 21h8M12 17v4"/></svg>';

/** A small Grafana-style panel: one bar per certificate, coloured by time left. */
function dashboardHtml(d: Doc) {
  const left = (n: number) => (n >= 730 ? `${(n / 365).toFixed(1)} years` : n >= 60 ? `${Math.round(n / 30)} months` : `${n} days`);
  const rows = d.lines.map((l, i) => {
    const [label, raw] = l.split('|');
    const n = Number(raw);
    const tone = n <= 31 ? 'bad' : n <= 90 ? 'warn' : 'ok';
    const pct = Math.max(3, Math.min(100, (n / 1460) * 100));
    return `<div class="dash-row ${d.mark?.includes(i) ? 'mark' : ''}"><span class="dash-l">${label}</span>
      <span class="dash-bar"><i class="g-${tone}" style="width:${pct}%"></i></span><span class="dash-n g-${tone}">${left(n)}</span></div>`;
  }).join('');
  return `<div class="doc d-dashboard"><div class="doc-title">${GAUGE}${d.title}</div>
    <div class="dash-tabs"><span>DEV</span><span>UAT</span><span class="on">PROD</span></div>${rows}</div>`;
}

function docHtml(d: Doc) {
  if (d.kind === 'dashboard') return dashboardHtml(d);
  const lines = d.lines.map((l, i) => `<div class="${d.mark?.includes(i) ? 'mark' : ''}">${l}</div>`).join('');
  return `<div class="doc d-${d.kind}"><div class="doc-title">${d.title}</div>${lines}</div>`;
}

/** The progress line: phases as coloured segments, a dot per moment, red loops for detours. */
function routeSvg(index: number, detours: Detour[], final: boolean) {
  const W = 1000, x0 = 30, x1 = 970, y = final ? 70 : 24;
  const n = MOMENTS.length;
  const xs = MOMENTS.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const segs: string[] = [], labels: string[] = [];
  for (const p of PHASE_ORDER) {
    const idx = MOMENTS.map((m, i) => (m.phase === p ? i : -1)).filter(i => i >= 0);
    if (!idx.length) continue;
    const a = xs[idx[0]], b = xs[idx[idx.length - 1]];
    labels.push(`<text x="${(a + b) / 2}" y="${y + 26}" class="s-label ${idx.includes(index) && !final ? 'on' : ''}">${p} · ${PHASES[p]}</text>`);
    segs.push(`<line x1="${a - 8}" y1="${y}" x2="${b + 8}" y2="${y}" class="s-phase p-${p}"/>`);
  }
  const done = final ? x1 : xs[Math.min(index, n - 1)];
  const loops = new Map<number, number>();
  detours.forEach(d => loops.set(d.index, (loops.get(d.index) ?? 0) + d.days));
  const loopSvg = [...loops.entries()].map(([i, days]) => {
    const x = xs[i], hgt = final ? 18 + Math.min(days, 30) * 1.4 : 14;
    return `<path d="M${x - 14},${y} C${x - 14},${y - hgt} ${x + 14},${y - hgt} ${x + 14},${y}" class="s-loop"/>` +
      (final ? `<text x="${x}" y="${y - hgt - 4}" class="s-loop-t">+${days}</text>` : '');
  }).join('');
  const dots = xs.map((x, i) => {
    const cls = i < index || final ? 'done' : i === index ? 'now' : '';
    return `<circle cx="${x}" cy="${y}" r="${i === index && !final ? 9 : 5.5}" class="s-dot ${cls}"><title>${MOMENTS[i].title}</title></circle>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${final ? 110 : 56}" preserveAspectRatio="none">
    <line x1="${x0 - 8}" y1="${y}" x2="${x1 + 8}" y2="${y}" class="s-track"/>
    ${segs.join('')}
    <line x1="${x0 - 8}" y1="${y}" x2="${done}" y2="${y}" class="s-done"/>
    ${loopSvg}${dots}${labels.join('')}
  </svg>`;
}
