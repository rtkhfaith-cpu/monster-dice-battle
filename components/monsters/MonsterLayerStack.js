import React from 'react';
import { View } from 'react-native';
import Svg, { G } from 'react-native-svg';
import { ThemedMonsterBody } from '../themedMonsterBodies';
import MonsterGearLayers from '../MonsterGearLayers';
import { LayerAura, LayerRarityRim, LayerShadow } from '../../art/monsters/layerPrimitives';
import { ART } from '../../utils/artDirection';
import { BattleShadingContext } from './BattleShadingContext';

/**
 * Layered monster renderer — shadow → aura → body → gear (front).
 * Used for battle, collection, and lobby previews.
 */
export default function MonsterLayerStack({
  size = 200,
  themeBody,
  themeAura,
  themePalette = null,
  themeArchetype = null,
  showRarityRim = false,
  stroke = ART.outline,
  ST = 6,
  e = 0,
  m = 0,
  mood = 'neutral',
  eyeWhite = '#fffef8',
  pupil = '#1a1a2e',
  cosmetics = [],
  showShadow = true,
  evolutionTier = 0,
  visualFormTier = null,
}) {
  if (!themeBody) return null;

  const tier = Math.min(3, Math.max(0, visualFormTier ?? evolutionTier ?? 0));
  const rimColor = themePalette?.glow ?? themeAura ?? ART.crit;

  return (
    <BattleShadingContext.Provider value={!showShadow}>
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <G>
            {showShadow ? <LayerShadow /> : null}
            <LayerAura color={themeAura} />
            {showRarityRim ? <LayerRarityRim color={rimColor} /> : null}
            <ThemedMonsterBody
              themeBody={themeBody}
              stroke={stroke}
              ST={ST}
              e={e}
              m={m}
              mood={mood}
              eyeWhite={eyeWhite}
              pupil={pupil}
              palette={themePalette}
              archetype={themeArchetype}
              evolutionTier={tier}
              visualFormTier={tier}
            />
            <MonsterGearLayers cosmetics={cosmetics} stroke={stroke} ST={ST} />
          </G>
        </Svg>
      </View>
    </BattleShadingContext.Provider>
  );
}
