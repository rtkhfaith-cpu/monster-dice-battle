export function expToNextForLevel(level) {
  const lv = Math.max(1, Math.floor(level || 1));
  if (lv <= 50) return 50 + lv * 20;
  if (lv <= 70) return 1200 + (lv - 50) * 90;
  if (lv <= 100) return 3000 + (lv - 70) * 180;
  const prestige = lv - 100;
  return 9000 + prestige * 350 + prestige * prestige * 25;
}

export const LEVELING_TARGETS = {
  early: { range: [1, 50], feel: 'easy, frequent level-ups' },
  mid: { range: [51, 70], feel: 'medium progression' },
  late: { range: [71, 100], feel: 'hard progression' },
  prestige: { range: [101, 120], feel: 'very hard endgame progression' },
};
