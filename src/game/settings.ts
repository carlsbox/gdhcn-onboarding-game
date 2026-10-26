import { MOMENTS, ROLES } from './scenario';
import type { Moment } from './types';

export type Person = 'business' | 'keymaster' | 'legal' | 'technical';

export interface Settings {
  country: string;
  code: string;
  names: Record<Person, string>;
}

export const DEFAULTS: Settings = {
  country: 'Country XC',
  code: 'XC',
  names: { business: 'Dr Zawadi Nkosi', keymaster: 'Kwame Mensah', legal: 'Sara Diallo', technical: 'Tendai Banda' },
};

/** Trust domains the player applies for this run. DDCC until chosen (dev jumps, the demo). */
const DEFAULT_DOMAINS = ['DDCC'];
let domains: string[] = [...DEFAULT_DOMAINS];
export const getDomains = () => domains;
export const setDomains = (d: string[]) => { domains = d.length ? [...d] : [...DEFAULT_DOMAINS]; };
export const resetDomains = () => { domains = [...DEFAULT_DOMAINS]; };
const joinList = (d: string[]) => d.length < 2 ? d.join('') : `${d.slice(0, -1).join(', ')} and ${d[d.length - 1]}`;
/** Tokens that change during a run: left alone when the scenario is built, filled as each moment plays. */
const LIVE = new Set(['domains', 'domainCount', 'domainLetters']);

const KEY = 'gdhcn-game-settings';
const TEMPLATE: Moment[] = structuredClone(MOMENTS);
let current: Settings = structuredClone(DEFAULTS);

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULTS, ...s, names: { ...DEFAULTS.names, ...(s.names ?? {}) } };
    }
  } catch { /* private window or blocked storage: fall back to defaults */ }
  return structuredClone(DEFAULTS);
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* not fatal */ }
}

export const settings = () => current;

/** "Kenya" -> KE, "South Africa" -> SA, "Country XC" -> XC */
export function deriveCode(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] ?? '';
  if (/^[A-Z]{2,3}$/.test(last)) return last;
  const letters = (w: string) => w.normalize('NFD').replace(/[^A-Za-z]/g, '');
  if (words.length > 1) return words.slice(0, 3).map(w => letters(w)[0] ?? '').join('').toUpperCase();
  return letters(words[0] ?? 'XC').slice(0, 2).toUpperCase() || 'XC';
}

// ISO 3166-1 alpha-2 -> alpha-3. Repository names must carry the 3-letter code (onboarding checklist).
const ALPHA3 = Object.fromEntries(('AD:AND AE:ARE AF:AFG AG:ATG AI:AIA AL:ALB AM:ARM AO:AGO AQ:ATA AR:ARG AS:ASM AT:AUT AU:AUS AW:ABW AX:ALA AZ:AZE ' +
  'BA:BIH BB:BRB BD:BGD BE:BEL BF:BFA BG:BGR BH:BHR BI:BDI BJ:BEN BL:BLM BM:BMU BN:BRN BO:BOL BQ:BES BR:BRA BS:BHS BT:BTN BV:BVT BW:BWA BY:BLR BZ:BLZ ' +
  'CA:CAN CC:CCK CD:COD CF:CAF CG:COG CH:CHE CI:CIV CK:COK CL:CHL CM:CMR CN:CHN CO:COL CR:CRI CU:CUB CV:CPV CW:CUW CX:CXR CY:CYP CZ:CZE ' +
  'DE:DEU DJ:DJI DK:DNK DM:DMA DO:DOM DZ:DZA EC:ECU EE:EST EG:EGY EH:ESH ER:ERI ES:ESP ET:ETH FI:FIN FJ:FJI FK:FLK FM:FSM FO:FRO FR:FRA ' +
  'GA:GAB GB:GBR GD:GRD GE:GEO GF:GUF GG:GGY GH:GHA GI:GIB GL:GRL GM:GMB GN:GIN GP:GLP GQ:GNQ GR:GRC GS:SGS GT:GTM GU:GUM GW:GNB GY:GUY ' +
  'HK:HKG HM:HMD HN:HND HR:HRV HT:HTI HU:HUN ID:IDN IE:IRL IL:ISR IM:IMN IN:IND IO:IOT IQ:IRQ IR:IRN IS:ISL IT:ITA JE:JEY JM:JAM JO:JOR JP:JPN ' +
  'KE:KEN KG:KGZ KH:KHM KI:KIR KM:COM KN:KNA KP:PRK KR:KOR KW:KWT KY:CYM KZ:KAZ LA:LAO LB:LBN LC:LCA LI:LIE LK:LKA LR:LBR LS:LSO LT:LTU LU:LUX LV:LVA LY:LBY ' +
  'MA:MAR MC:MCO MD:MDA ME:MNE MF:MAF MG:MDG MH:MHL MK:MKD ML:MLI MM:MMR MN:MNG MO:MAC MP:MNP MQ:MTQ MR:MRT MS:MSR MT:MLT MU:MUS MV:MDV MW:MWI MX:MEX MY:MYS MZ:MOZ ' +
  'NA:NAM NC:NCL NE:NER NF:NFK NG:NGA NI:NIC NL:NLD NO:NOR NP:NPL NR:NRU NU:NIU NZ:NZL OM:OMN PA:PAN PE:PER PF:PYF PG:PNG PH:PHL PK:PAK PL:POL PM:SPM PN:PCN PR:PRI PS:PSE PT:PRT PW:PLW PY:PRY ' +
  'QA:QAT RE:REU RO:ROU RS:SRB RU:RUS RW:RWA SA:SAU SB:SLB SC:SYC SD:SDN SE:SWE SG:SGP SH:SHN SI:SVN SJ:SJM SK:SVK SL:SLE SM:SMR SN:SEN SO:SOM SR:SUR SS:SSD ST:STP SV:SLV SX:SXM SY:SYR SZ:SWZ ' +
  'TC:TCA TD:TCD TF:ATF TG:TGO TH:THA TJ:TJK TK:TKL TL:TLS TM:TKM TN:TUN TO:TON TR:TUR TT:TTO TV:TUV TW:TWN TZ:TZA UA:UKR UG:UGA UM:UMI US:USA UY:URY UZ:UZB ' +
  'VA:VAT VC:VCT VE:VEN VG:VGB VI:VIR VN:VNM VU:VUT WF:WLF WS:WSM YE:YEM YT:MYT ZA:ZAF ZM:ZMB ZW:ZWE').split(' ').map(p => p.split(':')));

/** "KE" -> KEN; a 3-letter code is kept; an unknown (sample) code is padded with X, so XC -> XXC. */
export function alpha3(code: string) {
  const c = code.toUpperCase();
  return c.length === 3 ? c : ALPHA3[c] ?? `X${c}`.slice(0, 3);
}

const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const parts = (full: string) => full.replace(/^(dr|prof|mr|mrs|ms|hon)\.?\s+/i, '').trim().split(/\s+/);
const first = (full: string) => parts(full)[0] ?? full;
const initials = (full: string) => parts(full).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();

export function tokens(s: Settings): Record<string, string> {
  const code = s.code.toUpperCase();
  const domain = `health.${code.toLowerCase()}`;
  const km = parts(s.names.keymaster).map(ascii).filter(Boolean);
  const kmLocal = km.length > 1 ? `${km[0]}.${km[km.length - 1]}` : km[0] ?? 'keymaster';
  return {
    country: s.country, code, codeLower: code.toLowerCase(), code3: alpha3(code), code3Lower: alpha3(code).toLowerCase(), domain,
    business: s.names.business, keymaster: s.names.keymaster, legal: s.names.legal, technical: s.names.technical,
    keymasterFirst: first(s.names.keymaster), legalFirst: first(s.names.legal), technicalFirst: first(s.names.technical),
    keymasterEmail: `${kmLocal}@${domain}`, keymasterPersonal: `${kmLocal}@gmail.com`,
    domains: joinList(domains), domainCount: String(domains.length), domainLetters: `${domains.length} ${domains.length === 1 ? 'Letter' : 'Letters'}`,
  };
}

export function fill(text: string, s: Settings = current, keepLive = false) {
  const t = tokens(s);
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (keepLive && LIVE.has(k) ? undefined : t[k]) ?? m);
}

/** The words of a moment that mention the run's trust domains, filled with the current choice. */
export function liveMoment(m: Moment): Moment {
  return { ...m, brief: fill(m.brief), prompt: fill(m.prompt) };
}

function deepFill<T>(v: T, s: Settings): T {
  if (typeof v === 'string') return fill(v, s, true) as T;
  if (Array.isArray(v)) return v.map(x => deepFill(x, s)) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepFill(x, s)])) as T;
  }
  return v;
}

/** Make the chosen country and people the ones the whole game talks about. */
export function applySettings(s: Settings) {
  current = s;
  MOMENTS.splice(0, MOMENTS.length, ...deepFill(TEMPLATE, s));
  for (const k of Object.keys(s.names) as Person[]) {
    ROLES[k].name = s.names[k];
    ROLES[k].initials = initials(s.names[k]) || ROLES[k].initials;
  }
}
