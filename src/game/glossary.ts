import { lang } from '../i18n/lang';
import { frTypo } from '../i18n/typography';

/**
 * Glossary for hover/tap tooltips. Content strings may carry markup:
 *   [[key]]               shows GLOSSARY[key].term
 *   [[key|display text]]  shows the display text
 * Never put markup in choice text, checklist text or moment titles: a tap on a term
 * inside a button would select the answer.
 */
export const GLOSSARY_EN: Record<string, { term: string; def: string }> = {
  github: {
    term: 'GitHub',
    def: "GitHub is a website for storing code and files in repositories, with a full history of every change. In GDHCN onboarding, each country keeps its public keys and certificates in its own private GitHub repositories, and WHO's tng-bot collects them from there.",
  },
  repo: {
    term: 'Private repository',
    def: 'A folder on GitHub with version history. Private means only the people and bots you invite can see it.',
  },
  top: {
    term: 'Terms of Participation (TOP)',
    def: 'The five commitments, TOP0 to TOP4, that every GDHCN participant accepts: from following the technical specifications to meeting legal and policy standards.',
  },
  sca: {
    term: 'SCA · Signing Certificate Authority',
    def: "Your country's own trust anchor. Its private key signs your Document Signer Certificates and is kept offline.",
  },
  dsc: {
    term: 'DSC · Document Signer Certificate',
    def: 'Signs the health documents, such as vaccination certificates, that verifiers check.',
  },
  tls: {
    term: 'TLS client certificate',
    def: "Proves your backend's identity when it connects to the Gateway (mutual TLS).",
  },
  upload: {
    term: 'Upload certificate',
    def: 'Signs the packages of certificates your country uploads to the Gateway.',
  },
  dev: { term: 'DEV', def: 'Development environment. Optional, for early technical trials.' },
  uat: {
    term: 'UAT',
    def: 'User Acceptance Testing: the test gateway where you prove everything works before production. Test keys only.',
  },
  prod: { term: 'PROD', def: 'Production: the live Trust Network Gateway. Real keys, signed offline by WHO.' },
  tngbot: {
    term: 'tng-bot',
    def: "WHO's automated GitHub account. tng-bot-dev serves DEV and UAT; tng-bot serves PROD. It only reads repositories it is invited to.",
  },
  gpg: {
    term: 'GPG key',
    def: 'A personal key pair each named person uses to sign. WHO checks the email inside it against the Letter of Application.',
  },
  anchor: {
    term: 'Trust Anchor',
    def: "WHO's top-level key that signs every country's PROD keys. It is kept offline, never on the Gateway.",
  },
  gateway: {
    term: 'Trust Network Gateway',
    def: "WHO's server where participants exchange public keys and trust lists.",
  },
};

/**
 * French glossary. The code is the source: the rows in transcript-fr-delta-2026-10-26.md (keys glossary.<key>.term / .def)
 * are checked against this block by scripts/import-fr.mjs but not imported. Translator draft following
 * glossary-gdhcn-en-fr, awaiting review by the French facilitator.
 * A key missing here falls back to the English entry.
 */
export const GLOSSARY_FR: Record<string, { term: string; def: string }> = {
  github: {
    term: 'GitHub',
    def: "GitHub est un site qui permet de stocker du code et des fichiers dans des dépôts, avec l'historique complet des modifications. Pour l'adhésion au GDHCN, chaque pays conserve ses clés publiques et ses certificats dans ses propres dépôts GitHub privés, et le tng-bot de l'OMS les y collecte.",
  },
  repo: {
    term: 'Dépôt privé',
    def: "Un dossier sur GitHub avec historique des versions. Privé signifie que seules les personnes et les bots que vous invitez peuvent le voir.",
  },
  top: {
    term: 'Conditions de participation (TOP)',
    def: "Les cinq engagements, TOP0 à TOP4, que tout participant au GDHCN doit accepter : du respect des spécifications techniques à celui des normes juridiques et politiques.",
  },
  sca: {
    term: "SCA · autorité de certification de signature",
    def: "L'ancre de confiance propre à votre pays. Sa clé privée signe vos certificats de signataire de documents et reste hors ligne.",
  },
  dsc: {
    term: 'DSC · certificat de signataire de documents',
    def: "Signe les documents de santé, comme les certificats de vaccination, que les vérificateurs contrôlent.",
  },
  tls: {
    term: 'Certificat client TLS',
    def: "Prouve l'identité de votre backend lorsqu'il se connecte à la passerelle (mTLS).",
  },
  upload: {
    term: 'Certificat de téléversement',
    def: "Signe les paquets de certificats que votre pays téléverse sur la passerelle.",
  },
  dev: { term: 'DEV', def: "Environnement de développement. Facultatif, pour les premiers essais techniques." },
  uat: {
    term: 'UAT',
    def: "Tests d'acceptation par l'utilisateur : la passerelle de test où vous prouvez que tout fonctionne avant la production. Clés de test uniquement.",
  },
  prod: { term: 'PROD', def: "Production : la passerelle du réseau de confiance en service. Clés réelles, signées hors ligne par l'OMS." },
  tngbot: {
    term: 'tng-bot',
    def: "Le compte GitHub automatisé de l'OMS. tng-bot-dev sert DEV et UAT ; tng-bot sert PROD. Il ne lit que les dépôts auxquels il est invité.",
  },
  gpg: {
    term: 'Clé GPG',
    def: "Une paire de clés personnelle que chaque personne désignée utilise pour signer. L'OMS compare l'adresse e-mail qu'elle contient avec celle de la lettre de candidature.",
  },
  anchor: {
    term: 'Ancre de confiance',
    def: "La clé de plus haut niveau de l'OMS, qui signe les clés PROD de chaque pays. Elle est conservée hors ligne, jamais sur la passerelle.",
  },
  gateway: {
    term: 'Passerelle du réseau de confiance',
    def: "Le serveur de l'OMS où les participants échangent leurs clés publiques et les listes de confiance.",
  },
};

const typoed = (g: Record<string, { term: string; def: string }>) =>
  Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { term: frTypo(v.term), def: frTypo(v.def) }]));

export const GLOSSARY: Record<string, { term: string; def: string }> = lang() === 'fr' ? { ...GLOSSARY_EN, ...typoed(GLOSSARY_FR) } : GLOSSARY_EN;

const MARK = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Plain display text for a markup match: display text, else the glossary term, else the key. */
function display(key: string, shown?: string) {
  return shown ?? GLOSSARY[key]?.term ?? key;
}

/** Markup to HTML. Known keys become a tooltip trigger; unknown keys become plain text. */
export function renderTips(text: string): string {
  return text.replace(MARK, (_m, key: string, shown?: string) => {
    const k = key.trim();
    const label = display(k, shown);
    return GLOSSARY[k] ? `<span class="tip" tabindex="0" data-tip="${esc(k)}">${label}</span>` : label;
  });
}

/** Markup to plain text, for anywhere that is not HTML (title attributes, textContent, feedback). */
export function stripTips(text: string): string {
  return text.replace(MARK, (_m, key: string, shown?: string) => display(key.trim(), shown));
}
