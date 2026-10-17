import { settings } from '../game/settings';

/**
 * Reviewer feedback: a 💬 button on every screen that sends a comment, plus where the
 * reviewer was, to the Google Sheet via an Apps Script web app (apps-script/feedback.gs).
 * The endpoint comes from VITE_FEEDBACK_URL at build time.
 */

export interface FeedbackContext {
  mode: 'title' | 'game' | 'demo' | 'debrief';
  where?: string;   // human label, e.g. "Game · B · Create GPG keys"
  phase?: string;
  moment?: string;  // moment id + title, or demo beat
  steps?: string;
  days?: number;
  detours?: number;
}

const URL_ = (import.meta.env.VITE_FEEDBACK_URL as string | undefined) ?? '';
const WHO_KEY = 'gdhcn-feedback-who';
let ctx: FeedbackContext = { mode: 'title', where: 'Title screen' };

export function setFeedbackContext(c: FeedbackContext) { ctx = c; }

const TYPES = ['Accuracy (does not match WHO guidance)', 'Unclear or confusing', 'Bug or display problem', 'Idea or suggestion', 'Works well'];

export function mountFeedback(root: HTMLElement) {
  const btn = document.createElement('button');
  btn.id = 'fb-btn';
  btn.className = 'glass';
  btn.title = 'Send feedback on this screen';
  btn.innerHTML = '💬 <span>Feedback</span>';
  root.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'fb-panel';
  panel.className = 'glass';
  panel.innerHTML = `
    <div class="fb-head"><b>Send feedback</b><button class="fb-x" aria-label="Close">✕</button></div>
    <div class="fb-where"></div>
    <label>What kind?<select name="type">${TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>
    <label>Your comment<textarea name="comment" rows="5" maxlength="4000" placeholder="What did you notice? Quote the wording if it's about the text."></textarea></label>
    <div class="fb-row">
      <label>Name<input name="name" maxlength="200" autocomplete="name"></label>
      <label>Organisation<input name="org" maxlength="200" autocomplete="organization"></label>
    </div>
    <label>Email (optional, if you'd like a reply)<input name="email" type="email" maxlength="200" autocomplete="email"></label>
    <input name="website" class="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="fb-actions"><button class="primary fb-send">Send</button><span class="fb-status"></span></div>
    <p class="fb-fine">Comments go to the OS Forge review sheet with the screen you were on. Name and email are optional.</p>`;
  root.appendChild(panel);

  const $ = <T extends HTMLElement>(q: string) => panel.querySelector(q) as T;
  const field = (n: string) => panel.querySelector(`[name="${n}"]`) as HTMLInputElement;
  const status = $('.fb-status');

  // remember who the reviewer is between comments (this browser only)
  try {
    const who = JSON.parse(localStorage.getItem(WHO_KEY) ?? '{}') as Record<string, string>;
    for (const k of ['name', 'org', 'email']) if (who[k]) field(k).value = who[k];
  } catch { /* fine */ }

  const open = () => {
    $('.fb-where').textContent = `About: ${ctx.where ?? ctx.mode}${ctx.steps ? ` (WHO ${ctx.steps})` : ''}`;
    status.textContent = URL_ ? '' : 'Feedback is not connected on this copy of the game.';
    $<HTMLButtonElement>('.fb-send').disabled = !URL_;
    panel.classList.add('open');
    field('comment').focus();
  };
  const close = () => panel.classList.remove('open');
  btn.addEventListener('click', () => (panel.classList.contains('open') ? close() : open()));
  $('.fb-x').addEventListener('click', close);

  $('.fb-send').addEventListener('click', async () => {
    const comment = field('comment').value.trim();
    if (!comment) { status.textContent = 'Please write a comment first.'; field('comment').focus(); return; }
    const payload = {
      type: (panel.querySelector('select') as HTMLSelectElement).value,
      comment,
      name: field('name').value, org: field('org').value, email: field('email').value,
      website: field('website').value,
      where: ctx.where ?? '', phase: ctx.phase ?? '', moment: ctx.moment ?? '', steps: ctx.steps ?? '',
      mode: ctx.mode, country: `${settings().country} (${settings().code})`,
      days: ctx.days ?? '', detours: ctx.detours ?? '',
      page: location.href, browser: navigator.userAgent,
    };
    try { localStorage.setItem(WHO_KEY, JSON.stringify({ name: payload.name, org: payload.org, email: payload.email })); } catch { /* fine */ }
    const send = $<HTMLButtonElement>('.fb-send');
    send.disabled = true;
    status.textContent = 'Sending…';
    try {
      // text/plain keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer
      const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const out = await res.json().catch(() => ({ ok: res.ok }));
      if (!out.ok) throw new Error(out.error ?? 'not saved');
      field('comment').value = '';
      status.textContent = 'Thank you, your comment was saved.';
      setTimeout(close, 1600);
    } catch {
      status.textContent = "Couldn't send. Check your connection and try again; your comment is still here.";
    } finally {
      send.disabled = false;
    }
  });
}
