import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DungeonsHubScreen from './dungeon/DungeonsHubScreen';
import DungeonTeamSelectScreen from './dungeon/DungeonTeamSelectScreen';
import DungeonBattleScreen from './dungeon/DungeonBattleScreen';
import { getDungeonBoss } from '../utils/dungeon/dungeonBosses';

/**
 * Dungeon mode orchestrator: hub → team select → battle. Rendered while
 * App phase === 'dungeons'. Rewards are granted via onClaimRewards (App
 * persists and returns the drop list synchronously).
 */
export default function DungeonScreen({ profile, onExit, onClaimRewards, unlockAllBosses = false }) {
  const [view, setView] = useState('hub');
  const [bossId, setBossId] = useState(null);
  const [team, setTeam] = useState(null);

  const boss = bossId ? getDungeonBoss(bossId) : null;

  if (!profile) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTxt}>Select a player profile to enter Dungeons.</Text>
      </View>
    );
  }

  if (view === 'team' && boss) {
    return (
      <DungeonTeamSelectScreen
        boss={boss}
        profile={profile}
        onBack={() => setView('hub')}
        onStart={(assignments) => {
          setTeam(assignments);
          setView('battle');
        }}
      />
    );
  }

  if (view === 'battle' && boss && team) {
    return (
      <DungeonBattleScreen
        boss={boss}
        team={team}
        profile={profile}
        onClaimRewards={onClaimRewards}
        onExit={() => {
          setTeam(null);
          setBossId(null);
          setView('hub');
        }}
      />
    );
  }

  return (
    <DungeonsHubScreen
      onBack={onExit}
      unlockAllBosses={unlockAllBosses}
      onEnterBoss={(id) => {
        setBossId(id);
        setView('team');
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTxt: { color: '#94a3b8', fontWeight: '800', textAlign: 'center' },
});
