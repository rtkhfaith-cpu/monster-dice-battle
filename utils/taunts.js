const POOL = [
  'You smell like broccoli!',
  'Daddy Power!',
  'Ah Ma is watching!',
  'Mummy is coming!',
  'Too slow lah!',
  'Cannot tahan already!',
  'I am not scared!',
  'This one pain leh!',
  'Wait until Daddy hears!',
  'My socks are stronger!',
  'Homework can wait!',
  'One more bite…',
];

export function pickRandomTaunt() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}
