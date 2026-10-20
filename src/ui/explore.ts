import type { PlaceId, World } from '../world/World';
import { MOMENTS } from '../game/scenario';
import { fill } from '../game/settings';

/** What lives at each place: keys, documents, people. Shown on the explore info card. */
const HOLDS: Record<PlaceId, string> = {
  ministry: 'The four named representatives, the Statement of Interest and the Letter of Application.',
  backend: 'Private keys: TLS, Upload and Document Signer keys. The SCA private key, offline in the vault.',
  github: 'Public keys (PEM) and the GPG-signed tag, in a private repository per environment.',
  uat: 'Test copies of your public keys, auto-signed and whitelisted, plus the test trust list.',
  prod: 'Your whitelisted production public keys and the trust lists other countries download.',
  secretariat: 'Your application, the Letter of Application and the verified identities of your team.',
  ops: 'The WHO Trust Anchor, kept offline in the air-gapped room, and the pull requests tng-bot raises.',
  dashboard: "The expiry dates of every participant's certificates, per environment.",
};

const ORDER: PlaceId[] = ['ministry', 'backend', 'github', 'uat', 'prod', 'secretariat', 'ops', 'dashboard'];

/**
 * Explore the world before playing: free orbit, pan and zoom, clickable places with
 * info cards, place chips, reset view. Resolves with what the player chose next.
 */
export function explore(world: World, root: HTMLElement): Promise<'start' | 'back'> {
  const el = document.createElement('div');
  el.id = 'explore';
  el.innerHTML = `
    <div class="ex-hint glass">
      <b>Explore the world</b>
      <div class="ex-keys">
        <span class="k">Rotate</span><span>Drag</span>
        <span class="k">Move</span><span><kbd>Shift</kbd> + drag, or the arrow keys <i>(touch: two-finger drag)</i></span>
        <span class="k">Zoom</span><span>Scroll or pinch</span>
      </div>
      <span>Click any building to see what happens there.</span>
      <button class="ex-hint-x" aria-label="Hide tips">✕</button>
    </div>
    <div class="ex-card glass" hidden></div>
    <div class="ex-bar">
      <button class="nav-btn" data-a="back">← Back</button>
      <div class="ex-chips">${ORDER.map(id => `<button class="ex-chip" data-p="${id}">${world.places[id].name}</button>`).join('')}</div>
      <button class="nav-btn" data-a="reset" title="Back to the overview">⟲ Reset view</button>
      <button class="primary" data-a="start">Start onboarding ▶</button>
    </div>`;
  root.appendChild(el);

  const card = el.querySelector<HTMLElement>('.ex-card')!;
  const hint = el.querySelector<HTMLElement>('.ex-hint')!;
  const hideHint = () => hint.classList.add('gone');
  const hintTimer = setTimeout(hideHint, 9000);

  const show = (id: PlaceId) => {
    clearTimeout(hintTimer); hideHint();
    const p = world.places[id];
    const here = MOMENTS.filter(m => m.place === id);
    card.innerHTML = `<button class="ex-x" aria-label="Close">✕</button>
      <div class="eyebrow">${p.name}</div>
      <p>${fill(p.blurb)}</p>
      <h4>What lives here</h4><p>${HOLDS[id]}</p>
      ${here.length ? `<h4>In the game, this is where you</h4><ul>${here.map(m => `<li>${m.title} <span class="chip steps">WHO ${m.steps}</span></li>`).join('')}</ul>` : ''}`;
    card.hidden = false;
    el.querySelectorAll('.ex-chip').forEach(c => c.classList.toggle('on', (c as HTMLElement).dataset.p === id));
    world.mark(id);
    world.flyTo(id, { dur: 1.1 });
  };

  const prevPlaceClick = world.onPlaceClick;
  world.onPlaceClick = id => show(id);
  world.mark(null);
  world.flyTo('home', { dur: 1 });

  return new Promise(done => {
    const finish = (r: 'start' | 'back') => {
      clearTimeout(hintTimer);
      world.onPlaceClick = prevPlaceClick;
      world.mark(null);
      el.remove();
      done(r);
    };
    el.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!t) return;
      if (t.dataset.p) return show(t.dataset.p as PlaceId);
      if (t.classList.contains('ex-x')) { card.hidden = true; world.mark(null); el.querySelectorAll('.ex-chip.on').forEach(c => c.classList.remove('on')); return; }
      if (t.classList.contains('ex-hint-x')) return hideHint();
      switch (t.dataset.a) {
        case 'reset': card.hidden = true; world.mark(null); world.flyTo('home', { dur: 1 }); return;
        case 'start': return finish('start');
        case 'back': return finish('back');
      }
    });
  });
}
