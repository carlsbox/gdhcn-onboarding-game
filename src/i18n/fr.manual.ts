/**
 * Hand-written French for structural words that have no row in the reviewed transcripts
 * (list joiners, plural forms of code-built labels). Not reviewed by the facilitator: move a string
 * into a delta transcript and re-run scripts/import-fr.mjs when it has been.
 */
export const frManual: Record<string, string> = {
  'settings.ts:domains.and': ' et ',
  'settings.ts:letter.one': '{n} lettre',
  'settings.ts:letter.other': '{n} lettres',
};
