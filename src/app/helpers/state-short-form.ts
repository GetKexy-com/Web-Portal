import { usaStates } from 'src/assets/usaStates';
import { canadaStates } from 'src/assets/canadaStates';

/**
 * A US state / Canadian province as its postal code, for DISPLAY only ("New York State",
 * "new york", "ny" → "NY"). Anything not recognised is returned as it was.
 *
 * Stored values are never rewritten: the map and sports scrapers key their paid caches on
 * the stored state (KexyApi `mapLocationKey`), so changing it would re-pay for locations
 * already scraped. The Add Contact dropdown keeps the full names (`usaStates.js`).
 */
const lookup: Record<string, string> = {};

/** Lowercase, no dots, single spaces, without "state of" / a trailing "state"/"province". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^state of /, '')
    .replace(/ (state|province)$/, '');
}

for (const s of [...usaStates, ...canadaStates]) {
  lookup[normalise(s.name)] = s.code;
  lookup[s.code.toLowerCase()] = s.code;
}
// Names people also use that the dropdown lists differently, or not at all.
Object.assign(lookup, {
  'district of columbia': 'DC',
  'washington dc': 'DC',
  yukon: 'YT',
  'northwest territories': 'NT',
  nunavut: 'NU',
  yt: 'YT',
  nt: 'NT',
  nu: 'NU',
});

export function stateShortForm(state: string | null | undefined): string {
  if (typeof state !== 'string') return state ?? '';
  return lookup[normalise(state)] ?? state;
}
