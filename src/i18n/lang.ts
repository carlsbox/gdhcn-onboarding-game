/**
 * Site language. Source order: ?lang=fr|en in the URL (then remembered), else the remembered
 * choice in localStorage, else English. Changing it stores the choice and reloads the page,
 * because the scenario text is filled in once at start-up.
 */
export type Lang = 'en' | 'fr';

const KEY = 'gdhcn-lang';

const valid = (v: unknown): v is Lang => v === 'en' || v === 'fr';

function detect(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (valid(q)) {
      try { localStorage.setItem(KEY, q); } catch { /* private window: the URL still wins for this load */ }
      return q;
    }
  } catch { /* no location (build tooling) */ }
  try {
    const s = localStorage.getItem(KEY);
    if (valid(s)) return s;
  } catch { /* blocked storage */ }
  return 'en';
}

let current: Lang = detect();

export const lang = (): Lang => current;

/** Set <html lang> for the current language. Called once at start-up. */
export function applyHtmlLang() {
  document.documentElement.lang = current;
}

/** Store the choice, drop ?lang from the URL so it cannot override it, and reload. */
export function setLang(next: Lang) {
  try { localStorage.setItem(KEY, next); } catch { /* private window: carry it in the URL instead */
    const url = new URL(location.href); url.searchParams.set('lang', next); location.replace(url.toString()); return;
  }
  try { sessionStorage.removeItem('uc-lang'); } catch { /* ignore */ }
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) { url.searchParams.delete('lang'); history.replaceState(null, '', url.toString()); }
  location.reload();
}
