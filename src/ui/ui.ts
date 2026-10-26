import { MOMENTS, PHASES, ROLES } from '../game/scenario';
import type { ChecklistItem, Consequence, Doc, Moment, Phase } from '../game/types';
import { DEFAULTS, deriveCode, settings, type Person, type Settings } from '../game/settings';
import { devOn, devUnlocked, jumpTo, setDevOn } from './dev';
import { catLine, catMood, catShows, catsFound, catSvg, mrrp } from './cat';
import { USE_CASES } from '../usecases/data';
import { renderTips as T, stripTips } from '../game/glossary';

const h = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

export interface Detour { index: number; title: string; steps: string; why: string; days: number; origin?: string }
/** What a failed checklist submit tells the retry: the ticks to keep and the items to flag. */
export interface ChecklistMarks { picked: number[]; wrong: number[]; missing: number[]; noDomains: boolean }

export interface DebriefData { days: number; ideal: number; detours: Detour[] }

const PHASE_ORDER: Phase[] = ['A', 'B', 'C', 'D', 'E'];

export class UI {
  private hudEl: HTMLElement;
  private statsEl: HTMLElement;
  private stripEl: HTMLElement;
  private routeEl: HTMLElement;
  private deskEl: HTMLElement;
  private toastEl: HTMLElement;
  private menuEl: HTMLElement;
  private detourCount = 0;

  constructor(private root: HTMLElement) {
    this.hudEl = this.mount('<div id="hud" class="glass hidden"></div>');
    this.statsEl = this.mount(`<div id="stats" class="glass hidden">
      <div class="stat"><span class="stat-n" id="days">0</span><span class="stat-l">game days</span></div>
      <div class="stat"><span class="stat-n bad" id="detours">0</span><span class="stat-l">detours</span></div>
      <button id="reset-view" title="Reset the view">⟲</button></div>`);
    this.statsEl.querySelector('#reset-view')!.addEventListener('click', () => dispatchEvent(new CustomEvent('reset-view')));
    // progress strip: Home on the left, the subway route, Restart on the right
    this.stripEl = this.mount(`<div id="strip" class="glass hidden">
      <button class="strip-btn" data-leave="home" title="Back to the title screen">⌂ <span>Home</span></button>
      <div class="strip-route"></div>
      <button class="strip-btn" data-leave="restart" title="Restart onboarding from the first step">↺ <span>Restart</span></button></div>`);
    this.routeEl = this.stripEl.querySelector('.strip-route')!;
    this.stripEl.querySelectorAll<HTMLElement>('[data-leave]').forEach(b =>
      b.addEventListener('click', async () => {
        const where = b.dataset.leave as 'restart' | 'home';
        if (await this.confirmLeave(where)) go(where);
      }));
    this.deskEl = this.mount('<div id="desk" class="glass"></div>');
    this.toastEl = this.mount('<div id="toast" class="glass"></div>');
    // top bar: brand on the left, menu items on the right (more items can be added to .nav-items)
    this.mount(`<nav id="topnav" class="glass">
      <a class="nav-brand" href="${import.meta.env.BASE_URL}" data-go="home" title="Back to the start">GDHCN</a>
      <span class="nav-title">Join the Network</span>
      <div class="nav-items">
        ${devOn() ? '<span class="dev-chip">DEV</span><button class="nav-btn" data-go="end" title="Jump to the end (dev)">⏭ End</button>' : ''}
        <button class="nav-btn" data-go="usecases">▶ Use cases</button>
        <button class="nav-btn" id="settings-btn" aria-haspopup="true">⚙ Settings</button>
      </div></nav>`);
    this.menuEl = this.mount(`<div id="menu" class="glass">
      <button data-go="restart">Restart from the beginning</button>
      <div class="menu-l">Jump to a phase (facilitator)</div>
      ${PHASE_ORDER.map(p => `<button data-go="${p}">${p} · ${PHASES[p]}</button>`).join('')}
      <button data-go="about">About this simulation</button>
      ${devUnlocked() ? `<div class="menu-l">Reviewer tools</div>
      <label class="menu-toggle"><input type="checkbox" id="dev-toggle" ${devOn() ? 'checked' : ''}> Dev mode <span>clickable strip stops, previews, jump to end</span></label>` : ''}
      </div>`);
    document.getElementById('settings-btn')!.addEventListener('click', () => this.menuEl.classList.toggle('open'));
    document.getElementById('dev-toggle')?.addEventListener('change', e => { setDevOn((e.target as HTMLInputElement).checked); location.reload(); });
    const go = (target: string) => {
      this.menuEl.classList.remove('open');
      if (target === 'about') { this.about(); return; }
      if (target === 'end') { jumpTo('end'); return; }
      if (target === 'usecases') { dispatchEvent(new CustomEvent('open-usecases')); return; }
      if (target === 'home') { location.hash = ''; location.reload(); return; }
      location.hash = target === 'restart' ? 'restart' : `phase=${target}`; // #restart skips the title
      location.reload();
    };
    this.menuEl.addEventListener('click', e => { const t = (e.target as HTMLElement).dataset.go; if (t) go(t); });
    document.getElementById('topnav')!.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-go]')?.dataset.go;
      if (t) { e.preventDefault(); go(t); }
    });
  }

  private mount(html: string) { const el = h(html); this.root.appendChild(el); return el; }

  // ---------- title ----------

  title(initial: Settings): Promise<{ mode: 'play' | 'demo' | 'explore'; settings: Settings }> {
    const n = initial.names;
    const el = this.mount(`<div id="title" class="overlay">
      <div class="title-wrap">
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
        <div class="title-actions"><button class="primary" id="start">Start onboarding</button><button class="ghost" id="watch-demo">▶ Watch the demo</button><button class="ghost" id="explore-btn">🧭 Explore the world</button></div>
        <p class="fine">Based on WHO SMART Trust (smart.who.int/trust). The sample country and people are fictional. Game days are illustrative, not WHO timelines.</p>
      </div>
      <aside class="title-side glass">
        <div class="eyebrow">See it in action</div>
        <p class="side-lede">Short films showing what onboarding involves and what the network does once a country is live.</p>
        <button class="side-tile" id="side-demo">
          <span class="side-thumb" style="background-image:url('${import.meta.env.BASE_URL}video/demo-overview.jpg')"><span class="uc-play">▶</span><span class="uc-len">4 min</span></span>
          <span class="side-text"><span class="uc-tag">Narrated demo · this game</span><b>How onboarding works</b><span class="uc-sub">The ideal path from first email to go-live, in nine steps</span></span>
        </button>
        ${USE_CASES.map(u => `<button class="side-tile" data-uc="${u.id}">
          <span class="side-thumb" style="background-image:url('${import.meta.env.BASE_URL}${u.poster}')"><span class="uc-play">▶</span><span class="uc-len">${u.minutes}</span></span>
          <span class="side-text"><span class="uc-tag">${u.tag}</span><b>${u.title}</b><span class="uc-sub">${u.subtitle}</span></span>
        </button>`).join('')}
      </aside>
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
      const go = (mode: 'play' | 'demo' | 'explore') => {
        el.classList.add('gone');
        setTimeout(() => el.remove(), 500);
        done({ mode, settings: read() });
      };
      $('#start').addEventListener('click', () => go('play'));
      $("#watch-demo").addEventListener('click', () => go('demo'));
      $('#explore-btn').addEventListener('click', () => go('explore'));
      $('#side-demo').addEventListener('click', () => go('demo'));
      el.querySelectorAll<HTMLElement>('.side-tile[data-uc]').forEach(t =>
        t.addEventListener('click', () => dispatchEvent(new CustomEvent('open-usecase', { detail: t.dataset.uc }))));
    });
  }

  about() {
    const el = this.mount(`<div class="overlay"><div class="title-card glass">
      <h2>About this simulation</h2>
      <p>A learning tool that turns the WHO SMART Trust onboarding process into choices a country team makes. Step numbers refer to the published process at smart.who.int/trust, which remains the authority. The GDHCN Administrative and Operational Framework is authoritative for definitions.</p>
      <p>Simplifications: steps are grouped into moments, some checks are shown at a convenient point in the story, and game days are illustrative.</p>
      <button class="primary">Close</button>
      ${catsFound().length ? `<p class="built-by">🐾 Cats found: ${catsFound().length} of 3</p>` : ''}
      <p class="built-by">Built by <a href="https://osforge.co.za" target="_blank" rel="noopener">OS Forge</a></p></div></div>`);
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
    this.detourCount = detours;
    this.statsEl.querySelector('#days')!.textContent = String(days);
    this.statsEl.querySelector('#detours')!.textContent = String(detours);
  }

  strip(index: number, detours: Detour[]) {
    this.routeEl.innerHTML = routeSvg(index, detours, false);
    if (!devOn()) return;
    this.stripEl.classList.add('dev');
    this.routeEl.querySelectorAll<SVGElement>('[data-i]').forEach(d =>
      d.addEventListener('click', () => jumpTo(Number(d.dataset.i))));
  }

  /** Ask before throwing away a run in progress. Resolves true to go ahead. */
  private confirmLeave(where: 'restart' | 'home'): Promise<boolean> {
    const days = this.statsEl.querySelector('#days')!.textContent;
    const lost = `Your progress in this run (${days} game days, ${this.detourCount} detour${this.detourCount === 1 ? '' : 's'}) will be lost.`;
    const copy = where === 'restart'
      ? { h: 'Restart onboarding?', p: `${lost} You start again at the Statement of Interest, with the same country and team.`, ok: '↺ Restart' }
      : { h: 'Go back to the start?', p: `${lost} You return to the title screen; your country and team names are kept.`, ok: '⌂ Go home' };
    const el = this.mount(`<div class="overlay confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-h"><div class="title-card glass">
      <h2 id="confirm-h">${copy.h}</h2><p>${copy.p}</p>
      <div class="confirm-actions"><button class="primary" data-ok>${copy.ok}</button><button class="ghost" data-cancel>Cancel</button></div></div></div>`);
    return new Promise(done => {
      const close = (ok: boolean) => { removeEventListener('keydown', onKey); el.remove(); done(ok); };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
      addEventListener('keydown', onKey);
      el.querySelector('[data-ok]')!.addEventListener('click', () => close(true));
      el.querySelector('[data-cancel]')!.addEventListener('click', () => close(false));
      el.addEventListener('click', e => { if (e.target === el) close(false); });
      el.querySelector<HTMLElement>('[data-cancel]')!.focus();
    });
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
      <h2>${m.title}</h2><p class="brief">${T(m.brief)}</p>
      ${m.docs ? `<div class="docs">${m.docs.map(docHtml).join('')}</div>` : ''}`;
  }

  ask(m: Moment, disabled: Set<string>): Promise<string> {
    const choices = m.choices!.map(c => `<button class="choice" data-id="${c.id}" ${disabled.has(c.id) ? 'disabled' : ''}>${c.text}${disabled.has(c.id) ? '<span class="tried">tried</span>' : ''}</button>`).join('');
    const previews = devOn() ? m.choices!.filter(c => !c.correct).map(c =>
      `<button class="dev-preview" data-p="${c.id}">preview: ${c.flag ? 'delayed set-back' : 'set-back'} for "${stripTips(c.text).slice(0, 48)}${c.text.length > 48 ? '…' : ''}"</button>`).join('') : '';
    this.openDesk(`${this.header(m)}<div class="prompt">${T(m.prompt)}</div><div class="choices">${shuffle(choices)}</div>${previews ? `<div class="dev-previews"><span class="dev-chip">DEV</span>${previews}</div>` : ''}`);
    this.deskEl.querySelectorAll<HTMLButtonElement>('.dev-preview').forEach(b => b.addEventListener('click', () => {
      const c = m.choices!.find(x => x.id === b.dataset.p)!;
      if (c.consequence) this.preview(c.consequence);
      else if (c.flag) {
        const chk = MOMENTS.flatMap(x => x.checks ?? []).find(k => k.flag === c.flag);
        if (chk) this.preview(chk.consequence, { fix: chk.fix, origin: m.title });
      }
    }));
    return new Promise(done => {
      this.deskEl.querySelectorAll<HTMLButtonElement>('.choice').forEach(b => b.addEventListener('click', () => done(b.dataset.id!)));
    });
  }

  checklist(m: Moment, marks?: ChecklistMarks): Promise<number[]> {
    const cl = m.checklist!;
    const kept = new Set(marks?.picked ?? []);
    const items = cl.items.map((it: ChecklistItem, i: number) => {
      const wrong = marks?.wrong.includes(i), missing = marks?.missing.includes(i) || (marks?.noDomains && !!it.domain);
      const cls = `check${wrong ? ' bad' : ''}${missing ? ' warn' : ''}`;
      return `<label class="${cls}" data-i="${i}"><input type="checkbox" value="${i}"${kept.has(i) ? ' checked' : ''}><span>${it.text}${wrong && it.why ? `<small class="check-why">${it.why}</small>` : ''}</span></label>`;
    }).join('');
    this.openDesk(`${this.header(m)}<div class="prompt">${T(m.prompt)}</div><div class="checks">${items}</div>
      ${cl.note ? `<p class="check-note">${cl.note}</p>` : ''}
      ${marks ? '<div class="check-sum"></div>' : ''}
      <button class="primary send">${cl.button ?? 'Send the Letter to WHO'}</button>`);
    const boxes = [...this.deskEl.querySelectorAll<HTMLInputElement>('.check input')];
    const sum = this.deskEl.querySelector<HTMLElement>('.check-sum');
    const sync = () => {
      if (!marks) return;
      const on = (i: number) => boxes[i].checked;
      let toRemove = 0, missing = 0;
      boxes.forEach((b, i) => {
        const lab = b.closest('label')!;
        if (marks.wrong.includes(i)) { lab.classList.toggle('bad', b.checked); if (b.checked) toRemove++; }
        if (marks.missing.includes(i)) { lab.classList.toggle('warn', !b.checked); if (!b.checked) missing++; }
      });
      let noDom = false;
      if (marks.noDomains) {
        noDom = !cl.items.some((it, i) => it.domain && on(i));
        boxes.forEach((b, i) => { if (cl.items[i].domain) b.closest('label')!.classList.toggle('warn', noDom); });
      }
      const parts = [toRemove ? `${toRemove} to remove` : '', missing ? `${missing} missing` : '', noDom ? 'pick at least one trust domain' : ''].filter(Boolean);
      sum!.textContent = parts.join(', ');
      sum!.hidden = !parts.length;
    };
    boxes.forEach(b => b.addEventListener('change', sync));
    sync();
    return new Promise(done => {
      this.deskEl.querySelector('.send')!.addEventListener('click', () => {
        done(boxes.filter(i => i.checked).map(i => Number(i.value)));
      });
    });
  }

  watch(m: Moment): Promise<void> {
    this.openDesk(`${this.header(m)}<div class="prompt">${T(m.prompt)}</div><button class="primary go">Watch</button>`);
    return new Promise(done => this.deskEl.querySelector('.go')!.addEventListener('click', () => done()));
  }

  /** The easter-egg cat: a soft mrrp and one line of advice when clicked. */
  private bindCat(scope: HTMLElement) {
    const cat = scope.querySelector<HTMLButtonElement>('.desk-cat');
    cat?.addEventListener('click', () => {
      mrrp();
      cat.classList.remove('mrrp'); void cat.offsetWidth; cat.classList.add('mrrp');
      this.toast(`🐾 ${catLine()}`, 'info', 3200);
    });
  }

  /** Dev mode: show a set-back panel without playing it (no days, no detour). */
  preview(c: Consequence, opts: { fix?: string; origin?: string } = {}) {
    const el = this.mount(`<div class="overlay"><div class="title-card glass preview-card">
      <div class="eyebrow">Dev preview · not counted</div>
      <div class="ret-head"><span class="ret-icon">!</span><div><div class="ret-by">Returned by ${c.by}</div><div class="desk-sub">WHO ${c.steps}</div></div><span class="chip bad">+${c.days} days</span></div>
      <h2>${c.title}</h2>
      ${opts.origin ? `<p class="origin">This would surface later, at its check. The call is made at: <b>${opts.origin}</b>.</p>` : ''}
      <p><b>What happened.</b> ${T(c.what)}</p>${c.why ? `<p><b>Why.</b> ${T(c.why)}</p>` : ''}${opts.fix ? `<p class="fix"><b>The fix.</b> ${T(opts.fix)}</p>` : ''}
      <button class="primary">Close preview</button>
      <button class="desk-cat">${catSvg(catMood(this.detourCount))}</button></div></div>`);
    el.querySelector('button')!.addEventListener('click', () => el.remove());
    this.bindCat(el);
  }

  returned(c: Consequence, opts: { fix?: string; extra?: string[]; origin?: string } = {}): Promise<void> {
    this.openDesk(`<div class="ret-head"><span class="ret-icon">!</span><div><div class="ret-by">Returned by ${c.by}</div><div class="desk-sub">WHO ${c.steps}</div></div><span class="chip bad">+${c.days} days</span></div>
      <h2>${c.title}</h2>
      ${opts.origin ? `<p class="origin">This goes back to an earlier call: <b>${opts.origin}</b>. It looked fine at the time.</p>` : ''}
      <p><b>What happened.</b> ${T(c.what)}</p>
      ${opts.extra?.length ? `<ul class="extra">${opts.extra.map(x => `<li>${T(x)}</li>`).join('')}</ul>` : ''}
      ${c.why ? `<p><b>Why.</b> ${T(c.why)}</p>` : ''}
      ${opts.fix ? `<p class="fix"><b>The fix.</b> ${T(opts.fix)}</p>` : ''}
      <button class="primary go">${opts.fix ? 'Fix it and resend' : 'Try again'}</button>
      ${catShows() ? `<button class="desk-cat" title="…">${catSvg(catMood(this.detourCount))}</button>` : ''}`, 'returned');
    this.bindCat(this.deskEl);
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
        `<li><b>${x.title}</b> <span class="chip steps">WHO ${x.steps}</span> <span class="chip bad">+${x.days}</span><br>${T(x.why)}${x.origin ? `<br><span class="origin-l">Decision made earlier, at: ${stripTips(x.origin)}</span>` : ''}</li>`).join('')}</ol>` : ''}
      <h3>Where the keys live</h3>
      <div class="keys">
        <div class="k-col c-country"><b>${settings().country} keeps</b><ul><li>SCA private key, offline in the vault</li><li>TLS and Upload private keys</li><li>Document Signer private keys</li></ul></div>
        <div class="k-col c-github"><b>GitHub carries</b><ul><li>Public keys only (PEM)</li><li>A GPG-signed tag</li><li>Read by tng-bot-dev (UAT) and tng-bot (PROD)</li></ul></div>
        <div class="k-col c-who"><b>WHO holds</b><ul><li>The Trust Anchor, offline and air-gapped</li><li>Your verified people and GPG keys</li></ul></div>
        <div class="k-col c-network"><b>The Gateway publishes</b><ul><li>Whitelisted public keys</li><li>Trust lists for every participant</li></ul></div>
      </div>
      <h3>What to take back to your team</h3>
      <ol class="learn">${MOMENTS.filter(m => m.learn).map(m => `<li>${T(m.learn)}</li>`).join('')}</ol>
      <div class="debrief-actions"><button class="primary again">Finish</button><button class="ghost print">Print this debrief</button></div>
    </div></div>`);
    el.querySelector('.print')!.addEventListener('click', () => window.print());
    return new Promise(done => el.querySelector('.again')!.addEventListener('click', () => { el.remove(); done(); }));
  }
}

// ---------- completion splash ----------

const LINKS = [
  { href: 'https://www.who.int/initiatives/global-digital-health-certification-network', title: 'WHO Global Digital Health Certification Network', sub: 'The live GDHCN page at WHO' },
  { href: 'https://smart.who.int/trust/', title: 'WHO SMART Trust implementation guide', sub: 'The technical specification behind the network' },
  { href: 'https://smart.who.int/trust/concepts_onboarding.html', title: 'Onboarding process', sub: 'The steps this simulation follows' },
  { href: 'https://smart.who.int/trust/concepts_onboarding_checklist.html', title: 'Onboarding checklist', sub: 'Tools, certificates, repositories and tests, hands-on' },
  { href: 'https://github.com/WorldHealthOrganization/smart-trust', title: 'smart-trust on GitHub', sub: 'Source of the guide, with participant data' },
  { href: 'https://github.com/WorldHealthOrganization/tng-participant-template', title: 'tng-participant-template', sub: 'Template for your private key repositories' },
  { href: 'https://github.com/WorldHealthOrganization/GDHCNOnboardingWizard', title: 'WHO Onboarding Wizard (Windows)', sub: 'Repository, GPG and certificate steps on Windows' },
  { href: 'https://smart.who.int/trust/concepts_onboarding.html#letters-of-application', title: 'Letter of Application templates', sub: 'One per trust domain, in several languages' },
  { href: 'mailto:gdhcn-secretariat@who.int', title: 'gdhcn-secretariat@who.int', sub: 'Governance: Statement of Interest and Letters' },
  { href: 'mailto:gdhcn-support@who.int', title: 'gdhcn-support@who.int', sub: 'Technical help during onboarding' },
];

export function splash(root: HTMLElement, detours = 1, domains: string[] = ['DDCC']): Promise<'again' | 'demo'> {
  const el = document.createElement('div');
  el.id = 'splash';
  el.className = 'overlay';
  el.innerHTML = `<div class="splash-card glass">
    <div class="splash-badge-wrap"><div class="splash-badge" aria-hidden="true">✓</div>${detours === 0 ? `<span class="splash-cat" title="A perfect run">${catSvg('crown')}</span>` : ''}</div>
    <div class="eyebrow">Simulation complete</div>
    <h1>Congratulations. ${settings().country} is live.</h1>
    <p class="lede">Live in: ${domains.length < 2 ? domains.join('') : `${domains.slice(0, -1).join(', ')} and ${domains[domains.length - 1]}`}.</p>
    <p class="lede">You took ${settings().country} from a Statement of Interest to the production Trust Network Gateway: eligibility, keys, the Letter of Application, identity checks, WHO's offline signing, testing and go-live.</p>
    <h3>Take it further</h3>
    <div class="splash-links">${LINKS.map(l => `<a href="${l.href}" target="_blank" rel="noopener"><b>${l.title}</b><span>${l.sub}</span></a>`).join('')}</div>
    <p class="fine">This is a learning simulation. The WHO SMART Trust guide and the GDHCN Administrative and Operational Framework are the authority.</p>
    <div class="title-actions"><button class="primary" data-n="again">Play again</button><button class="ghost" data-n="demo">▶ Watch the demo</button></div>
  </div>`;
  root.appendChild(el);
  return new Promise(done => el.addEventListener('click', e => {
    const n = (e.target as HTMLElement).dataset.n as 'again' | 'demo' | undefined;
    if (n) { el.remove(); done(n); }
  }));
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
    return `<div class="dash-row ${d.mark?.includes(i) ? 'mark' : ''}"><span class="dash-l">${T(label)}</span>
      <span class="dash-bar"><i class="g-${tone}" style="width:${pct}%"></i></span><span class="dash-n g-${tone}">${left(n)}</span></div>`;
  }).join('');
  return `<div class="doc d-dashboard"><div class="doc-title">${GAUGE}${T(d.title)}</div>
    <div class="dash-tabs"><span>DEV</span><span>UAT</span><span class="on">PROD</span></div>${rows}</div>`;
}

function docHtml(d: Doc) {
  if (d.kind === 'dashboard') return dashboardHtml(d);
  const lines = d.lines.map((l, i) => `<div class="${d.mark?.includes(i) ? 'mark' : ''}">${T(l)}</div>`).join('');
  return `<div class="doc d-${d.kind}"><div class="doc-title">${T(d.title)}</div>${lines}</div>`;
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
    const hit = final ? '' : `<circle cx="${x}" cy="${y}" r="16" class="s-hit" data-i="${i}"><title>${i + 1}. ${stripTips(MOMENTS[i].title)}</title></circle>`;
    return `<circle cx="${x}" cy="${y}" r="${i === index && !final ? 9 : 5.5}" class="s-dot ${cls}"><title>${stripTips(MOMENTS[i].title)}</title></circle>${hit}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${final ? 110 : 56}" preserveAspectRatio="none">
    <line x1="${x0 - 8}" y1="${y}" x2="${x1 + 8}" y2="${y}" class="s-track"/>
    ${segs.join('')}
    <line x1="${x0 - 8}" y1="${y}" x2="${done}" y2="${y}" class="s-done"/>
    ${loopSvg}${dots}${labels.join('')}
  </svg>`;
}
