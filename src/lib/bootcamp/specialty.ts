export const SPECIALTY_TRACKS = [
  { key: 'balayage', label: 'Balayage', mannequin: 10, models: 4 },
  { key: 'babylights', label: 'Babylights', mannequin: 10, models: 4 },
  { key: 'combo', label: 'Balayage & babylights combined', mannequin: 10, models: 4 },
  { key: 'ombre', label: 'Ombré (tip-outs added to a full foil)', mannequin: 10, models: 4 },
  { key: 'platinum', label: 'Platinum card', mannequin: 10, models: 1 },
  { key: 'curly', label: 'Specialty curly cutting', mannequin: 10, models: 4 },
] as const;
export const TRACK_KEYS = SPECIALTY_TRACKS.map(t => t.key) as [string, ...string[]];
