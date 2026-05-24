/**
 * Passive skill battle UI — center comments, float colors, and labels.
 */
import { POPUP_LABELS } from './passiveResolver';

/** @typedef {'heal'|'poison'|'burn'|'reflect'|'info'} PassiveFloatKind */

/** @type {Record<string, { label: string, floatKind: PassiveFloatKind, color: string }>} */
export const PASSIVE_POPUP_DISPLAY = {
  [POPUP_LABELS.BLOOD_DRAIN]: { label: 'Lifesteal', floatKind: 'heal', color: '#2ecc71' },
  [POPUP_LABELS.POISONED]: { label: 'Poison', floatKind: 'poison', color: '#b565f7' },
  [POPUP_LABELS.BURN]: { label: 'Burn', floatKind: 'burn', color: '#ff6b35' },
  [POPUP_LABELS.REGEN]: { label: 'Regen', floatKind: 'heal', color: '#2ecc71' },
  [POPUP_LABELS.REFLECT]: { label: 'Reflect', floatKind: 'reflect', color: '#f59e0b' },
  [POPUP_LABELS.BARRIER]: { label: 'Barrier', floatKind: 'info', color: '#48cae4' },
  [POPUP_LABELS.IRON_GUARD]: { label: 'Iron Guard', floatKind: 'info', color: '#48cae4' },
  [POPUP_LABELS.RAGE_CORE]: { label: 'Rage Core', floatKind: 'info', color: '#ff4757' },
};

const PASSIVE_POPUP_KEYS = new Set(Object.keys(PASSIVE_POPUP_DISPLAY));

/** Center arena comment from passive popup keys (e.g. "Lifesteal · Poison"). */
export function formatPassiveCenterComment(popupLabels = []) {
  const parts = (popupLabels || [])
    .filter((key) => PASSIVE_POPUP_KEYS.has(key))
    .map((key) => PASSIVE_POPUP_DISPLAY[key]?.label ?? key);
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
  const popups = new Set(resolved.popupsToShow || []);

  if ((resolved.healing ?? 0) > 0 && popups.has(POPUP_LABELS.BLOOD_DRAIN)) {
    floats.push({
      fighterId: attackerId,
      floatKind: 'heal',
      amount: resolved.healing,
      label: PASSIVE_POPUP_DISPLAY[POPUP_LABELS.BLOOD_DRAIN].label,
    });
  }
  if ((resolved.reflectedDamage ?? 0) > 0) {
    floats.push({
      fighterId: attackerId,
      floatKind: 'reflect',
      amount: resolved.reflectedDamage,
      label: PASSIVE_POPUP_DISPLAY[POPUP_LABELS.REFLECT].label,
    });
  }
  if (resolved.statusEffectsApplied?.includes('poison')) {
    floats.push({
      fighterId: defenderId,
      floatKind: 'poison',
      amount: 0,
      label: PASSIVE_POPUP_DISPLAY[POPUP_LABELS.POISONED].label,
      statusApplied: true,
    });
  }
  if (resolved.statusEffectsApplied?.includes('burn')) {
    floats.push({
      fighterId: defenderId,
      floatKind: 'burn',
      amount: 0,
      label: PASSIVE_POPUP_DISPLAY[POPUP_LABELS.BURN].label,
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
      label: PASSIVE_POPUP_DISPLAY[POPUP_LABELS.REGEN].label,
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
  const dotType = ticked.dotType ?? (ticked.popup === POPUP_LABELS.BURN ? 'burn' : 'poison');
  const key = dotType === 'burn' ? POPUP_LABELS.BURN : POPUP_LABELS.POISONED;
  const display = PASSIVE_POPUP_DISPLAY[key];
  return [
    {
      fighterId,
      floatKind: dotType === 'burn' ? 'burn' : 'poison',
      amount: dmg,
      label: display?.label ?? (dotType === 'burn' ? 'Burn' : 'Poison'),
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
