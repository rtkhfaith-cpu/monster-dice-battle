/**
 * Random integer helpers + stat bundle roller for ranged combat stats.
 */
export function randInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**
 * @returns {{
 * hp: number, mp: number,
 * attack: {min:number,max:number}, magic: {min:number,max:number},
 * def: {min:number,max:number}, magicDef: {min:number,max:number},
 * critPct: number, dodgePct: number
 * }}
 */
export function rollStatsBundle() {
  const hp = randInt(150, 220);
  const mp = randInt(50, 100);
  const atkMin = randInt(14, 22);
  const atkMax = atkMin + randInt(5, 10);
  const magMin = randInt(16, 25);
  const magMax = magMin + randInt(5, 12);
  const defMin = randInt(5, 12);
  const defMax = defMin + randInt(4, 8);
  const mdMin = randInt(5, 12);
  const mdMax = mdMin + randInt(4, 8);

  const critPct = randInt(5, 12);
  const dodgePct = randInt(8, 18);

  return {
    hp,
    mp,
    attack: { min: atkMin, max: atkMax },
    magic: { min: magMin, max: magMax },
    def: { min: defMin, max: defMax },
    magicDef: { min: mdMin, max: mdMax },
    critPct,
    dodgePct,
  };
}

export function rollDice() {
  return randInt(1, 6);
}

export function randomVariant(maxIndex, avoid = null) {
  if (maxIndex <= 0) return 0;
  let idx = randInt(0, maxIndex);
  let guard = 0;
  while (avoid !== null && idx === avoid && guard < 20) {
    idx = randInt(0, maxIndex);
    guard += 1;
  }
  return idx;
}
