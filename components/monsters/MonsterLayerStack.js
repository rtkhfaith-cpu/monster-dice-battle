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

  const isBattle = !showShadow;
  const svgH = isBattle ? size * 1.12 : size;
  const viewBox = isBattle ? '0 -14 200 214' : '0 0 200 200';

  return (
    <BattleShadingContext.Provider value={isBattle}>
      <View style={{ width: size, height: svgH, alignSelf: 'center', overflow: 'visible' }}>
        <Svg width={size} height={svgH} viewBox={viewBox}>
          <G>
            {showShadow ? <LayerShadow /> : null}
            {showShadow && themeAura ? <LayerAura color={themeAura} /> : null}
            {showShadow && showRarityRim ? <LayerRarityRim color={rimColor} /> : null}
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
