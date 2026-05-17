import React from 'react';
import BodyBubbleTea from './BodyBubbleTea';
import BodyCableSerpent from './BodyCableSerpent';
import BodyChicken from './BodyChicken';
import BodyCockroach from './BodyCockroach';
import BodyCrocs from './BodyCrocs';
import BodyDurianKnight from './BodyDurianKnight';
import BodyHomework from './BodyHomework';
import BodyIphone from './BodyIphone';
import BodyLunchbox from './BodyLunchbox';
import BodyNuggetDragon from './BodyNuggetDragon';
import BodyPencil from './BodyPencil';
import BodyPizzaMeteor from './BodyPizzaMeteor';
import BodyPoop from './BodyPoop';
import BodySchoolbag from './BodySchoolbag';
import BodySixtySeven from './BodySixtySeven';
import BodySkibidi from './BodySkibidi';
import BodyTablet from './BodyTablet';
import BodyToiletPaper from './BodyToiletPaper';
import BodyToiletron from './BodyToiletron';
import BodyTrex from './BodyTrex';
import BodyWaterBottle from './BodyWaterBottle';
import BodyWifiWraith from './BodyWifiWraith';
import { FALLBACK_PALETTE } from './shared';
import EvolutionOverlay, { evolutionBodyTransform } from '../evolution/EvolutionOverlay';
import { G } from 'react-native-svg';

const BODY_MAP = {
  cockroach: BodyCockroach,
  chicken: BodyChicken,
  water_bottle: BodyWaterBottle,
  crocs: BodyCrocs,
  iphone: BodyIphone,
  lunchbox: BodyLunchbox,
  pencil: BodyPencil,
  homework: BodyHomework,
  toilet_paper: BodyToiletPaper,
  schoolbag: BodySchoolbag,
  trex: BodyTrex,
  tablet: BodyTablet,
  skibidi: BodySkibidi,
  bubble_tea: BodyBubbleTea,
  sixtyseven: BodySixtySeven,
  poop: BodyPoop,
  nugget_dragon: BodyNuggetDragon,
  cable_serpent: BodyCableSerpent,
  pizza_meteor: BodyPizzaMeteor,
  wifi_wraith: BodyWifiWraith,
  toiletron: BodyToiletron,
  durian_knight: BodyDurianKnight,
};

/**
 * @param {{
 *   themeBody: string,
 *   stroke: string,
 *   e?: number,
 *   m?: number,
 *   mood?: string,
 *   eyeWhite?: string,
 *   pupil?: string,
 *   palette?: object,
 *   archetype?: string,
 *   ST?: number,
 *   evolutionTier?: number,
 * }} p
 */
export function ThemedMonsterBody(p) {
  const { themeBody } = p;
  const Body = BODY_MAP[themeBody];
  if (!Body) return null;
  const tier = Math.min(3, Math.max(0, p.evolutionTier ?? p.visualFormTier ?? 0));
  const { transform } = evolutionBodyTransform(tier);
  const palette = p.palette ?? p.themePalette ?? FALLBACK_PALETTE;
  return (
    <G>
      <G transform={transform}>
        <Body {...p} palette={palette} evolutionTier={tier} />
      </G>
      <EvolutionOverlay
        themeBody={themeBody}
        evolutionTier={tier}
        palette={palette}
        stroke={p.stroke}
      />
    </G>
  );
}

export { BODY_MAP };
