import { USE_CASES, type UseCase } from './data';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

/**
 * "Use cases" pages: a gallery of the use-case films and a page per film.
 * Opens over whatever is on screen (title, game or demo) and closes back to it,
 * so a game in progress is not lost. Deep links: #usecases and #usecase/<id>.
 */
export class UseCasesPage {
  private el: HTMLElement;
  private prevHash = '';

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'usecases';
    this.el.className = 'overlay';
    this.el.hidden = true;
    root.appendChild(this.el);
    this.el.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-uc],[data-a]');
      if (!t) { if (e.target === this.el) this.close(); return; }
      if (t.dataset.uc) this.open(t.dataset.uc);
      else if (t.dataset.a === 'gallery') this.open();
      else if (t.dataset.a === 'close') this.close();
      else if (t.dataset.a === 'play') { this.close(); location.hash = ''; location.reload(); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !this.el.hidden) this.close(); });
  }

  /** Read #usecases / #usecase/<id> on load. */
  openFromHash(): boolean {
    const m = /^#usecases?(?:\/([\w-]+))?$/.exec(location.hash);
    if (!m) return false;
    this.open(m[1]);
    return true;
  }

  open(id?: string) {
    if (this.el.hidden) this.prevHash = /^#usecase/.test(location.hash) ? '' : location.hash;
    this.stopVideo();
    const uc = id ? USE_CASES.find(u => u.id === id) : undefined;
    this.el.innerHTML = uc ? this.detail(uc) : this.gallery();
    this.el.hidden = false;
    this.el.scrollTop = 0;
    history.replaceState(null, '', uc ? `#usecase/${uc.id}` : '#usecases');
  }

  close() {
    this.stopVideo();
    this.el.hidden = true;
    history.replaceState(null, '', this.prevHash || location.pathname);
  }

  private stopVideo() { this.el.querySelector('video')?.pause(); }

  private gallery() {
    return `<div class="uc-card glass">
      <div class="uc-top"><div class="eyebrow">Use cases</div><button class="uc-x" data-a="close" aria-label="Close">✕</button></div>
      <h1>The network in people's lives</h1>
      <p class="lede">Two short animated films follow people whose health records cross a border between two fictional countries, Nordavia and Coralia. Each one shows what the Global Digital Health Certification Network does, and what it never does.</p>
      <div class="uc-grid">${USE_CASES.map(u => `
        <button class="uc-tile" data-uc="${u.id}">
          <span class="uc-thumb" style="background-image:url('${asset(u.poster)}')"><span class="uc-play">▶</span><span class="uc-len">${u.minutes}</span></span>
          <span class="uc-tag">${u.tag}</span>
          <b>${u.title}</b>
          <span class="uc-sub">${u.subtitle}</span>
        </button>`).join('')}
      </div></div>`;
  }

  private detail(u: UseCase) {
    const others = USE_CASES.filter(o => o.id !== u.id);
    return `<div class="uc-card glass">
      <div class="uc-top"><button class="nav-btn" data-a="gallery">← All use cases</button><button class="uc-x" data-a="close" aria-label="Close">✕</button></div>
      <div class="uc-tag">${u.tag}</div>
      <h1>${u.title}</h1>
      <p class="uc-sub big">${u.subtitle}</p>
      <video class="uc-video" controls playsinline preload="metadata" poster="${asset(u.poster)}" src="${asset(u.video)}"></video>
      <blockquote class="uc-idea">${u.idea}</blockquote>
      <h3>What the film shows</h3>
      <p>${u.summary}</p>
      <h3>How the GDHCN helps here</h3>
      <ul class="uc-how">${u.how.map(h => `<li>${h}</li>`).join('')}</ul>
      <h3>Why this use case</h3>
      <p>${u.why}</p>
      <div class="title-actions">
        <button class="primary" data-a="play">Play the onboarding game</button>
        ${others.map(o => `<button class="ghost" data-uc="${o.id}">Next: ${o.title} →</button>`).join('')}
      </div>
      <p class="fine">Nordavia and Coralia are fictional. The films are illustrations; the WHO SMART Trust guide is the authority on how the network works.</p>
    </div>`;
  }
}
