/**
 * Use-case films shown under "Use cases" in the top bar.
 * To add one: put the video (and a poster frame) in public/video/ and add an entry here.
 * For a French version, also put it in public/video/ and set videoFr; the film page then shows an
 * English / Français switch. Posters and page text stay English.
 * Text is drawn from the story scripts for each film; keep it to what the film shows.
 */
export interface UseCase {
  id: string;            // used in the URL: #usecase/<id>
  title: string;
  subtitle: string;
  tag: string;           // short label on the card
  video: string;         // path under public/ (English)
  videoFr?: string;      // optional French version, path under public/
  poster: string;
  posterFr?: string;     // poster frame for the French version
  minutes: string;
  summary: string;       // one paragraph: what the film shows
  idea: string;          // the one line the viewer should leave with
  how: string[];         // how the GDHCN helps in this case
  why: string;           // why this use case matters
}

export const USE_CASES: UseCase[] = [
  {
    id: 'icvp',
    title: "Mary's Yellow Card",
    subtitle: 'A digital yellow fever certificate that any border can check',
    tag: 'Digital ICVP · vaccination certificate',
    video: 'video/icvp-marys-yellow-card.mp4',
    videoFr: 'video/icvp-marys-yellow-card-fr.mp4',
    poster: 'video/icvp-marys-yellow-card.jpg',
    posterFr: 'video/icvp-marys-yellow-card-fr.jpg',
    minutes: '4 min',
    summary: "Mary lives in Nordavia and is travelling to Coralia, which asks for proof of yellow fever vaccination. At the travel clinic she is vaccinated and the nurse records it as usual. Behind the screen, Nordavia turns that record into a standard digital vaccination certificate (the International Certificate of Vaccination or Prophylaxis, ICVP), signs it with a key that never leaves the country, and gives Mary a QR code on her phone and on her paper yellow card. At the border in Coralia, the port health officer scans it and the check passes in seconds. A forged card, signed with a key no trusted country published, fails.",
    idea: 'The certificate carries its own proof. The network carries trust, not data.',
    how: [
      'Nordavia joined the network once: it proved who it is and shared only its public keys, which the network added to a trust list.',
      "Coralia keeps a copy of that trust list, so its officer checks the signature, that the key hasn't been revoked, and the vaccination rules, with no call to Nordavia or to the network. It works offline.",
      'The QR code carries the certificate itself, with only what a border needs to know. Nobody can change it without breaking the signature.',
      "The network never carries Mary's vaccination record and never sees her name.",
    ],
    why: 'Vaccination certificates for travel are one of the first uses of the network, and the same signed code works whether it is shown on a phone or printed on the paper yellow card.',
  },
  {
    id: 'maternal',
    title: "Amina's Journey",
    subtitle: "A mother's care record that can safely cross a border",
    tag: 'International Patient Summary · maternal care',
    video: 'video/maternal-aminas-journey.mp4',
    videoFr: 'video/maternal-aminas-journey-fr.mp4',
    poster: 'video/maternal-aminas-journey.jpg',
    posterFr: 'video/maternal-aminas-journey-fr.jpg',
    minutes: '4 min',
    summary: "Amina is seven months pregnant in Nordavia and plans to give birth near her mother, across the border in Coralia. Her antenatal care, including a penicillin allergy, stays in Nordavia as a standard International Patient Summary. What she carries is a signed QR code that points to that summary and holds no medical details. When labour comes early at a hospital she has never seen, the midwife scans the code with Amina's consent, checks the signature against Nordavia's public key, confirms her identity, and only then fetches the summary from Nordavia. The allergy is right there.",
    idea: 'The QR code points to the record; it is not the record. The network carries trust, not data.',
    how: [
      "Nordavia's signature on the code is checked against the public keys the network publishes, so Coralia knows the reference is genuine.",
      'The summary stays at home, held by Nordavia under its own rules, and is fetched directly from Nordavia only for an authorised health worker, with consent.',
      "The network never carries Amina's health information and never sees her name.",
      "Her baby's birth and first vaccines are recorded in Coralia in a record of his own, and Nordavia's clinic carries on his schedule with no gaps and no repeated doses.",
    ],
    why: "Continuity of care across borders matters most in the first 1,000 days of a child's life, and the International Patient Summary already supports it at summary level.",
  },
];
