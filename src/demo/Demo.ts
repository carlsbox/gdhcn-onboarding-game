import type { PlaceId, World } from '../world/World';
import { setFeedbackContext } from '../ui/feedback';

// Playback speed (1 outside the demo). Every demo wait is expressed in 1x milliseconds and
// is consumed in short slices at the current speed, so a change mid-wait applies at once.
let speed = 1;
const wait = (ms: number) => new Promise<void>(r => {
  let left = ms, last = performance.now();
  const step = () => {
    const now = performance.now();
    left -= (now - last) * speed; last = now;
    if (left <= 0) r(); else setTimeout(step, Math.min(left / speed, 50));
  };
  setTimeout(step, Math.min(ms / speed, 50));
});

interface Beat {
  title: string;
  steps: string;
  body: string;
  place: PlaceId | 'home';
  prodOpen?: boolean;
  /** Show the four role tiles, lit in time with the narration. */
  cast?: boolean;
  /** Plays the beat. Check dead() between awaits so a skip stops it cleanly. */
  run: (w: World, dead: () => boolean) => Promise<void>;
}

/**
 * The ideal path in nine beats. Every claim here mirrors a moment in scenario.ts;
 * the demo just plays the right answers with a caption, no choices and no errors.
 * It is deliberately generic ("The Country", role titles) so the recorded narration
 * (public/audio/demo/beat-NN.mp3, Higgsfield voice Naomi, speech rate 15) always matches.
 */
const BEATS: Beat[] = [
  {
    title: 'Ask to join', steps: 'Steps 1–8', place: 'home',
    body: "The Country's Ministry of Health emails a Statement of Interest to the GDHCN Secretariat. WHO checks that the Country is eligible and accepts the Terms of Participation, then invites it to onboard and sends the technical specifications.",
    run: async (w, dead) => {
      await w.travel([['paper', 1]], 'Statement of Interest', 'paper'); if (dead()) return;
      await w.travel([['paper', -1]], 'Invitation + technical specs', 'paper');
    },
  },
  {
    title: 'Name the team, make the keys', steps: 'Step 9', place: 'backend', cast: true,
    body: "The Country names four people: a Business Owner, a Legal representative, a Technical lead, and a Key Master, who runs the Country's keys. The Key Master creates a Signing CA, a TLS and an Upload certificate for testing, and a separate set for production. The Signing CA's private key goes into an offline vault and never leaves the Country.",
    run: async w => { await w.travel([['ministry-backend', 1]], 'Key generation', 'key'); },
  },
  {
    title: 'Public keys to GitHub', steps: 'Steps 9–11', place: 'home',
    body: "Each authorised person creates a GPG key with their official email address. The Technical lead puts the public keys, never the private ones, in private GitHub repositories, and invites WHO's bots: tng-bot-dev for testing, and tng-bot for production. The Key Master signs the release tag from the terminal.",
    run: async w => { await w.travel([['backend-github', 1]], 'Public keys (PEM) + signed tag', 'key'); },
  },
  {
    title: 'Send the Letter of Application', steps: 'Steps 12–14', place: 'home',
    body: "Before production, the Legal representative sends a Letter of Application for each trust domain the Country joins. It names the four contacts, the GPG key fingerprints and the production repository. The certificates themselves stay in the repository for tng-bot to collect.",
    run: async w => { await w.travel([['paper', 1]], 'Letter of Application', 'paper'); },
  },
  {
    title: 'WHO verifies the people', steps: 'Steps 15–23', place: 'secretariat',
    body: "WHO confirms the named people face to face, or through the diplomatic channel, and checks that the email inside every GPG key matches the Letter.",
    run: async (w, dead) => {
      await wait(1800); if (dead()) return;
      await w.flyTo('home', { dur: 1.1, caption: true }); if (dead()) return;
      await w.travel([['paper', -1]], 'Identities confirmed', 'paper');
    },
  },
  {
    title: 'tng-bot collects the keys', steps: 'Steps 23–46', place: 'github',
    body: "WHO Operations takes over. tng-bot clones the signed tag, verifies it against the onboarded GPG keys, and collects the public keys. Test keys are signed automatically and whitelisted.",
    run: async (w, dead) => {
      await w.botTo('github'); if (dead()) return;
      w.bot.setMood('checking'); await wait(2000); if (dead()) return;
      w.bot.setMood('happy'); await wait(1200); if (dead()) return;
      await w.travel([['github-ops', 1]], 'Public keys, tag verified', 'key'); if (dead()) return;
      await w.botTo('ops'); w.bot.setMood('idle'); if (dead()) return;
      await w.flyTo('home', { dur: 1.1, caption: true }); if (dead()) return;
      await w.travel([['ops-uat', 1]], 'UAT keys: auto-signed', 'key');
    },
  },
  {
    title: 'WHO signs PROD offline', steps: 'Steps 36–50', place: 'ops',
    body: "Production keys are verified by WHO, and signed with the WHO Trust Anchor in an air-gapped process. The Trust Anchor's private key never sits on the online gateway.",
    run: async (w, dead) => {
      w.pulseAnchor(); await wait(2200); if (dead()) return;
      await w.flyTo('home', { dur: 1.1, caption: true }); if (dead()) return;
      await w.travel([['ops-prod', 1]], 'PROD keys: signed offline', 'key');
    },
  },
  {
    title: 'Test before going live', steps: 'Steps 60–69', place: 'home',
    body: "The Technical lead connects to a test gateway with the TLS client certificate. Testing can run on DEV, UAT or PROD. The dry run uploads a Document Signer Certificate, revokes one, downloads the trust list and validates samples. When it passes, WHO opens production.",
    run: async (w, dead) => {
      await w.travel([['backend-uat', 1]], 'mTLS · GET /trustList', 'data'); if (dead()) return;
      await w.travel([['backend-uat', 1]], 'Upload · revoke · download', 'data'); if (dead()) return;
      w.setProdOpen(true); w.pulseGateway('prod', '#4fe0a0');
    },
  },
  {
    title: 'Go live', steps: 'Steps 70–80', place: 'home', prodOpen: true,
    body: "A Document Signer Certificate, signed by the Signing CA, is packaged, signed with the Upload certificate, uploaded to production and found in the trust list. One is revoked to prove that works, the results go by email, and a confirmation tells the Country and WHO that onboarding is complete. From here, renewing certificates on time is the Country's job.",
    run: async (w, dead) => {
      await w.travel([['backend-prod', 1]], 'CMS package (DSC)', 'data'); if (dead()) return;
      await w.travel([['backend-prod', -1]], 'Trust list: DSC present', 'data'); if (dead()) return;
      await w.travel([['backend-prod', 1]], 'Revoke one DSC', 'data'); if (dead()) return;
      await w.travel([['paper', 1]], 'Test results', 'paper'); if (dead()) return;
      w.pulseGateway('prod', '#4fe0a0');
      await w.travel([['paper', -1]], 'Onboarding complete', 'paper'); if (dead()) return;
      w.bot.setMood('happy');
    },
  },
];

const VOICE_KEY = 'gdhcn-demo-voice';
const SPEED_KEY = 'gdhcn-demo-speed';
// TODO(i18n): move this label into the i18n files
const SPEED_LABEL = 'Playback speed';
const SPEEDS = [1, 1.25, 1.5, 2];

// Role tiles for beat 2. Cue times (seconds into beat-02.mp3) come from the pauses in Naomi's take,
// so each tile lights as its role is spoken. Regenerate the clip and these need re-timing.
const ICON = {
  business: '<path d="M4 8h16v11H4z"/><path d="M9 8V5h6v3"/><path d="M4 13h16"/>',
  legal: '<path d="M12 4v16"/><path d="M7 20h10"/><path d="M5 8h14"/><path d="M5 8l-3 6a3 3 0 0 0 6 0z"/><path d="M19 8l-3 6a3 3 0 0 0 6 0z"/>',
  technical: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/><path d="M10 9l-2 2 2 2"/><path d="M14 9l2 2-2 2"/>',
  keymaster: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9"/><path d="M18 12v3"/><path d="M21 12v2"/>',
};
const CAST = [
  { k: 'business', role: 'Business Owner', duty: 'Owns the use cases', at: 3.1 },
  { k: 'legal', role: 'Legal representative', duty: "WHO's contact on legal and policy", at: 4.3 },
  { k: 'technical', role: 'Technical lead', duty: 'Security, infrastructure, conformance', at: 6.8 },
  { k: 'keymaster', role: 'Key Master', duty: "Runs the Country's keys", at: 8.7 },
] as const;
const CAST_CERTS_AT = 13.8;  // "The Key Master creates a Signing CA, a TLS and an Upload certificate..."
const CAST_VAULT_AT = 20.7;  // "The Signing CA's private key goes into an offline vault..."


export class Demo {
  private el: HTMLElement;
  private i = 0;
  private gen = 0;
  private paused = false;
  private sound = true;
  private speaking = false;
  private audio = new Audio();
  private finished!: (next: 'play' | 'again' | 'title') => void;

  constructor(private world: World, root: HTMLElement) {
    try { this.sound = localStorage.getItem(VOICE_KEY) !== '0'; } catch { /* default on */ }
    this.audio.preload = 'auto';
    this.audio.addEventListener('playing', () => { this.speaking = true; });
    for (const ev of ['ended', 'error'] as const) this.audio.addEventListener(ev, () => { this.speaking = false; });
    this.el = document.createElement('div');
    this.el.id = 'demo';
    this.el.innerHTML = `
      <div class="demo-badge glass">DEMO · the ideal path, no mistakes</div>
      <div class="demo-caption glass"><div class="demo-meta"></div><h2></h2><p></p></div>
      <div class="demo-bar glass">
        <button data-a="back" title="Previous">⏮</button>
        <button data-a="play" title="Pause" class="demo-play">⏸</button>
        <button data-a="next" title="Next">⏭</button>
        <div class="demo-dots">${BEATS.map((_, i) => `<button data-i="${i}" title="${BEATS[i].title}"></button>`).join('')}</div>
        <select class="demo-speed" aria-label="${SPEED_LABEL}" title="${SPEED_LABEL}">${SPEEDS.map(v => `<option value="${v}">${v}×</option>`).join('')}</select>
        <button data-a="voice" title="Narration on or off" class="demo-voice"></button>
        <button data-a="exit" title="Leave the demo">✕</button>
      </div>
      <button class="demo-tap glass" hidden>🔊 Tap for sound</button>`;
    root.appendChild(this.el);
    this.el.querySelector('.demo-tap')!.addEventListener('click', () => this.unblock());
    this.el.querySelector('.demo-bar')!.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      if (b.dataset.i) return this.play(Number(b.dataset.i));
      switch (b.dataset.a) {
        case 'back': return this.play(Math.max(0, this.i - 1));
        case 'next': return this.i < BEATS.length - 1 ? this.play(this.i + 1) : this.end();
        case 'play': return this.togglePause();
        case 'voice': return this.toggleVoice();
        case 'exit': this.stop(); return this.finished('title');
      }
    });
    this.renderVoice();
    let saved = 1;
    try { saved = Number(sessionStorage.getItem(SPEED_KEY)); } catch { /* default 1x */ }
    const sel = this.el.querySelector<HTMLSelectElement>('.demo-speed')!;
    this.setSpeed(SPEEDS.includes(saved) ? saved : 1);
    sel.value = String(speed);
    sel.addEventListener('change', () => {
      this.setSpeed(Number(sel.value));
      try { sessionStorage.setItem(SPEED_KEY, String(speed)); } catch { /* not fatal */ }
      sel.blur();
    });
  }

  /** One time-scale for everything: waits, caption hold, world animation and the narration clip. */
  private setSpeed(v: number) {
    speed = v;
    this.world.timeScale = v;
    const a = this.audio as HTMLAudioElement & { mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean };
    a.playbackRate = v;
    a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
  }

  private resetSpeed() { speed = 1; this.world.timeScale = 1; }

  /** Runs the demo; resolves with what the viewer chose at the end. */
  run(): Promise<'play' | 'again' | 'title'> {
    return new Promise(done => { this.finished = done; this.play(0); });
  }

  private async play(i: number) {
    const gen = ++this.gen;
    const dead = () => gen !== this.gen;
    this.i = i;
    this.paused = false;
    this.el.querySelector('.demo-play')!.textContent = '⏸';
    const b = BEATS[i];
    this.world.cancelAll();
    this.world.reset();
    this.world.setProdOpen(!!b.prodOpen);
    this.world.mark(b.place === 'home' ? null : b.place);
    const body = b.body;
    setFeedbackContext({ mode: 'demo', where: `Demo · beat ${i + 1} · ${b.title}`, moment: `beat ${i + 1} · ${b.title}`, steps: b.steps });
    this.caption(i, b, body);
    this.narrate(i);
    const started = performance.now();
    this.showCast(b.cast ? gen : 0, started);

    await this.world.flyTo(b.place, { dur: 1.3, caption: true }); if (dead()) return;
    await b.run(this.world, dead); if (dead()) return;

    // hold the caption long enough to read (or until Naomi finishes), and while paused
    const readMs = Math.min(11000, Math.max(4500, body.length * 55));
    while (!dead() && ((performance.now() - started) * speed < readMs || this.paused || (this.sound && this.speaking))) await wait(200);
    if (!dead()) await wait(600);
    if (dead()) return;
    if (i < BEATS.length - 1) this.play(i + 1); else this.end();
  }

  /** Role tiles that light up as Naomi names each role (beat 2 only). */
  private showCast(gen: number, started: number) {
    this.el.querySelector('.demo-cast')?.remove();
    if (!gen) return;
    const box = document.createElement('div');
    box.className = 'demo-cast';
    box.innerHTML = CAST.map(c => `<div class="cast-tile c-${c.k}" data-k="${c.k}">
        <div class="cast-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[c.k]}</svg></div>
        <div class="cast-role">${c.role}</div><div class="cast-duty">${c.duty}</div>
        ${c.k === 'keymaster' ? '<div class="cast-chips"><span class="chip-certs">Signing CA · TLS · Upload<br>for UAT and for PROD</span><span class="chip-vault">🔒 SCA key: offline vault</span></div>' : ''}
      </div>`).join('');
    this.el.appendChild(box);
    const tiles = [...box.querySelectorAll<HTMLElement>('.cast-tile')];
    const tick = () => {
      if (gen !== this.gen || !box.isConnected) { clearInterval(timer); return; }
      // follow the narration clip when it is running (muted still advances); otherwise the wall clock
      const a = this.audio;
      const t = a.currentTime > 0 || !a.paused ? a.currentTime : (performance.now() - started) * speed / 1000;
      tiles.forEach((el, n) => {
        const lit = t >= CAST[n].at;
        const isNow = lit && (n === CAST.length - 1 || t < CAST[n + 1].at);
        el.classList.toggle('lit', lit);
        el.classList.toggle('now', isNow);
      });
      box.classList.toggle('certs', t >= CAST_CERTS_AT);
      box.classList.toggle('vault', t >= CAST_VAULT_AT);
    };
    const timer = setInterval(tick, 100);
    tick();
  }

  private caption(i: number, b: Beat, body: string) {
    const c = this.el.querySelector('.demo-caption')!;
    c.classList.remove('in'); void (c as HTMLElement).offsetWidth; c.classList.add('in');
    c.querySelector('.demo-meta')!.innerHTML = `<span>${i + 1} of ${BEATS.length}</span><span class="chip steps">WHO ${b.steps}</span>`;
    c.querySelector('h2')!.textContent = b.title;
    c.querySelector('p')!.textContent = body;
    this.el.querySelectorAll<HTMLElement>('.demo-dots button').forEach((d, k) => {
      d.className = k < i ? 'done' : k === i ? 'now' : '';
    });
  }

  private togglePause() {
    this.paused = !this.paused;
    this.el.querySelector('.demo-play')!.textContent = this.paused ? '▶' : '⏸';
    if (this.paused) this.audio.pause();
    else if (this.sound && this.speaking) this.audio.play().catch(e => this.blocked(e));
  }

  private toggleVoice() {
    this.sound = !this.sound;
    try { localStorage.setItem(VOICE_KEY, this.sound ? '1' : '0'); } catch { /* not fatal */ }
    this.renderVoice();
    this.audio.muted = !this.sound;
    if (this.sound && this.speaking && !this.paused) this.audio.play().catch(e => this.blocked(e));
  }

  private renderVoice() {
    const v = this.el.querySelector('.demo-voice')!;
    v.textContent = this.sound ? '🔊' : '🔈';
    v.classList.toggle('on', this.sound);
  }

  /** Play this beat's recorded narration (Higgsfield voice Naomi). */
  private narrate(i: number) {
    this.audio.pause();
    this.audio.src = `${import.meta.env.BASE_URL}audio/demo/beat-${String(i + 1).padStart(2, '0')}.mp3`;
    this.audio.muted = !this.sound;
    this.audio.playbackRate = speed; // setting src can reset it
    this.speaking = true; // until the clip ends or fails to load
    this.audio.play().catch(e => this.blocked(e));
  }

  /** The browser refused autoplay (e.g. the page opened straight on #demo): carry on silently. */
  private blocked(e?: unknown) {
    // a play() cut short by skipping to another beat is not a blocked autoplay
    if ((e as DOMException | undefined)?.name === 'AbortError') return;
    this.speaking = false;
    if (this.sound) (this.el.querySelector('.demo-tap') as HTMLElement).hidden = false;
  }

  private unblock() {
    (this.el.querySelector('.demo-tap') as HTMLElement).hidden = true;
    this.sound = true; this.renderVoice();
    this.audio.muted = false;
    this.audio.currentTime = 0;
    this.speaking = true;
    this.audio.play().catch(e => this.blocked(e));
  }

  private stop() {
    this.gen++;
    this.resetSpeed();
    this.el.querySelector('.demo-cast')?.remove();
    this.audio.pause();
    this.world.cancelAll();
    this.el.remove();
  }

  private end() {
    this.gen++;
    this.resetSpeed();
    this.audio.pause();
    const card = document.createElement('div');
    card.className = 'overlay';
    card.innerHTML = `<div class="title-card glass">
      <div class="eyebrow">Demo complete</div>
      <h1>The Country is live</h1>
      <p class="lede">That is the whole journey on the ideal path. In the game, your team makes each call, and wrong calls come back, sometimes much later.</p>
      <div class="title-actions"><button class="primary" data-n="play">Play it yourself</button><button class="ghost" data-n="again">Watch again</button><button class="ghost" data-n="title">Back to the start</button></div>
    </div>`;
    this.el.appendChild(card);
    card.addEventListener('click', e => {
      const n = (e.target as HTMLElement).dataset.n as 'play' | 'again' | 'title' | undefined;
      if (!n) return;
      this.stop();
      this.finished(n);
    });
  }
}
