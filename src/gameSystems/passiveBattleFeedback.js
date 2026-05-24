/**
 * Passive skill battle UI — labels, float colors, center comments.
 * Popup keys match addPopup() in passiveResolver (e.g. BLOOD_DRAIN, not "BLOOD DRAIN").
 */

/** @typedef {'heal'|'poison'|'burn'|'reflect'|'info'} PassiveFloatKind */

/** @type {Record<string, { label: string, floatKind: PassiveFloatKind, color: string }>} */
export const PASSIVE_POPUP_DISPLAY = {
  BLOOD_DRAIN: { label: 'Lifesteal', floatKind: 'heal', color: '#2ecc71' },
  POISONED: { label: 'Poison', floatKind: 'poison', color: '#b565f7' },
  BURN: { label: 'Burn', floatKind: 'burn', color: '#ff6b35' },
  REGEN: { label: 'Regen', floatKind: 'heal', color: '#2ecc71' },
  REFLECT: { label: 'Reflect', floatKind: 'reflect', color: '#f59e0b' },
  BARRIER: { label: 'Barrier', floatKind: 'info', color: '#48cae4' },
  IRON_GUARD: { label: 'Iron Guard', floatKind: 'info', color: '#48cae4' },
  RAGE_CORE: { label: 'Rage Core', floatKind: 'info', color: '#ff4757' },
};

/** Normalize popupsToShow entries to PASSIVE_POPUP_DISPLAY keys. */
export function resolvePopupKey(raw) {
  if (!raw) return null;
  const key = String(raw).trim();
  if (PASSIVE_POPUP_DISPLAY[key]) return key;
  const underscored = key.replace(/\s+/g, '_').toUpperCase();
  if (PASSIVE_POPUP_DISPLAY[underscored]) return underscored;
  return null;
}

/** Center/banner comment (e.g. "Lifesteal · Poison"). */
export function formatPassiveCenterComment(popupLabels = []) {
  const parts = (popupLabels || [])
    .map(resolvePopupKey)
    .filter(Boolean)
    .map((key) => PASSIVE_POPUP_DISPLAY[key].label);
  if (!parts.length) return null;
  return parts.join(' · ');
}

export function isPassiveFeedbackMessage(msg) {
  if (!msg) return false;
  const labels = Object.values(PASSIVE_POPUP_DISPLAY).map((d) => d.label.toLowerCase());
  const lower = String(msg).toLowerCase();
  return labels.some((l) => lower.includes(l.toLowerCase()));
}

/**
 * @param {object} resolved — resolveAttackWithPassives result
 * @param {1|2} attackerId
 * @param {1|2} defenderId
 */
export function buildFloatsFromAttackResolved(resolved, attackerId, defenderId) {
  const floats = [];
  if (!resolved) return floats;

  if ((resolved.healing ?? 0) > 0) {
    floats.push({
      fighterId: attackerId,
      floatKind: 'heal',
      amount: resolved.healing,
      label: PASSIVE_POPUP_DISPLAY.BLOOD_DRAIN.label,
    });
  }
  if ((resolved.reflectedDamage ?? 0) > 0) {
    floats.push({
      fighterId: attackerId,
      floatKind: 'reflect',
      amount: resolved.reflectedDamage,
      label: PASSIVE_POPUP_DISPLAY.REFLECT.label,
    });
  }
  if (resolved.statusEffectsApplied?.includes('poison')) {
    floats.push({
      fighterId: defenderId,
      floatKind: 'poison',
      amount: 0,
      label: PASSIVE_POPUP_DISPLAY.POISONED.label,
      statusApplied: true,
    });
  }
  if (resolved.statusEffectsApplied?.includes('burn')) {
    floats.push({
      fighterId: defenderId,
      floatKind: 'burn',
      amount: 0,
      label: PASSIVE_POPUP_DISPLAY.BURN.label,
      statusApplied: true,
    });
  }
  return floats;
}

/** @param {1|2} fighterId */
export function buildFloatFromRegen(fighterId, healing) {
  if (!healing || healing <= 0) return [];
  return [
    {
      fighterId,
      floatKind: 'heal',
      amount: healing,
      label: PASSIVE_POPUP_DISPLAY.REGEN.label,
    },
  ];
}

/**
 * @param {1|2} fighterId
 * @param {{ tickDamage?: number, popup?: string|null, dotType?: string }} ticked
 */
export function buildFloatFromDotTick(fighterId, ticked) {
  const dmg = ticked?.tickDamage ?? 0;
  if (dmg <= 0) return [];
  const dotType = ticked.dotType ?? (resolvePopupKey(ticked.popup) === 'BURN' ? 'burn' : 'poison');
  const display =
    dotType === 'burn' ? PASSIVE_POPUP_DISPLAY.BURN : PASSIVE_POPUP_DISPLAY.POISONED;
  return [
    {
      fighterId,
      floatKind: dotType === 'burn' ? 'burn' : 'poison',
      amount: dmg,
      label: display.label,
    },
  ];
}

export function floatColorForKind(floatKind) {
  if (floatKind === 'heal') return '#2ecc71';
  if (floatKind === 'poison') return '#b565f7';
  if (floatKind === 'burn') return '#ff6b35';
  if (floatKind === 'reflect') return '#f59e0b';
  return '#48cae4';
}
