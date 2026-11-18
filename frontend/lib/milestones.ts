/**
 * Development milestones, 0–2 years. "typical" is when most babies do it;
 * "checkBy" is when not doing it yet is worth showing a doctor (the CDC/AAP
 * 2022 checklists and IAP red flags). Every baby moves at their own pace;
 * a late milestone means "get it checked", not "something is wrong".
 */
export type Area = 'social' | 'movement' | 'talking' | 'hands';
export interface Milestone { id: string; text: string; area: Area; typical: number; checkBy: number | null }

export const MILESTONES: Milestone[] = [
  { id: 'smile', text: 'Smiles back at you', area: 'social', typical: 1.5, checkBy: 3 },
  { id: 'head', text: 'Holds head steady when held upright', area: 'movement', typical: 3, checkBy: 4 },
  { id: 'sounds', text: 'Turns towards your voice or a sound', area: 'talking', typical: 4, checkBy: 6 },
  { id: 'coo', text: 'Coos, babbles and makes sounds back to you', area: 'talking', typical: 4, checkBy: 6 },
  { id: 'reach', text: 'Reaches for a toy and holds it', area: 'hands', typical: 4, checkBy: 6 },
  { id: 'roll', text: 'Rolls over', area: 'movement', typical: 5, checkBy: null },
  { id: 'sit', text: 'Sits without support', area: 'movement', typical: 7, checkBy: 9 },
  { id: 'name', text: 'Looks up when you call their name', area: 'social', typical: 8, checkBy: 12 },
  { id: 'crawl', text: 'Crawls (some babies skip this)', area: 'movement', typical: 9, checkBy: null },
  { id: 'pincer', text: 'Picks up small food with thumb and finger', area: 'hands', typical: 9, checkBy: 12 },
  { id: 'stand', text: 'Stands holding on to something', area: 'movement', typical: 9, checkBy: 12 },
  { id: 'wave', text: 'Waves bye-bye or points at things', area: 'social', typical: 10, checkBy: 14 },
  { id: 'word', text: 'Says a first word with meaning ("mama", "dada")', area: 'talking', typical: 12, checkBy: 16 },
  { id: 'walk', text: 'Walks alone', area: 'movement', typical: 13, checkBy: 18 },
  { id: 'words', text: 'Uses several words and follows simple requests', area: 'talking', typical: 18, checkBy: 24 },
  { id: 'phrase', text: 'Puts two words together ("more milk")', area: 'talking', typical: 24, checkBy: null },
];

export const AREA_LABEL: Record<Area, string> = { social: 'Social', movement: 'Movement', talking: 'Talking', hands: 'Hands' };

export interface MilestoneView extends Milestone { done: string | null; state: 'done' | 'late' | 'now' | 'soon' | 'later' }

/** Each milestone with where baby is: done, worth checking (late), now, coming soon, or later. */
export function milestoneView(months: number, done: Record<string, string>): MilestoneView[] {
  return MILESTONES.map(m => {
    const d = done[m.id] || null;
    const state: MilestoneView['state'] = d ? 'done'
      : m.checkBy !== null && months >= m.checkBy ? 'late'
      : months >= m.typical - 1 ? 'now'
      : months >= m.typical - 3 ? 'soon'
      : 'later';
    return { ...m, done: d, state };
  });
}
