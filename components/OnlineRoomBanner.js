import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Compact online room status on the home screen.
 */
export default function OnlineRoomBanner({ roomState, mySlot, onOpenLobby, onLeaveRoom }) {
  if (!roomState?.roomCode) return null;

  const me = mySlot === 'p2' ? roomState.players?.p2 : roomState.players?.p1;
  const opp = mySlot === 'p2' ? roomState.players?.p1 : roomState.players?.p2;
  const oppJoined = !!opp?.profile;
  const oppConnected = !!opp?.connected;
  const inBattle = roomState.status === 'battle';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Online room {roomState.roomCode}</Text>
      <Text style={styles.line}>
        You: {me?.profile?.name ?? '—'} · {me?.ready ? 'Ready' : 'Not ready'}
      </Text>
      <Text style={styles.line}>
        Opponent:{' '}
        {!oppConnected && !oppJoined
          ? 'Waiting for opponent…'
          : `${opp?.profile?.name ?? 'Joined'} · ${opp?.ready ? 'Ready' : 'Not ready'}`}
      </Text>
      {oppJoined && opp?.profile ? (
        <Text style={styles.mon}>
          {opp.profile.monsterName} Lv{opp.profile.level} · HP {opp.profile.hp}/{opp.profile.maxHp}
        </Text>
      ) : null}
      {inBattle ? <Text style={styles.battle}>Battle in progress — tap to rejoin</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.openBtn} onPress={onOpenLobby}>
          <Text style={styles.openTxt}>{inBattle ? 'Rejoin battle' : 'Open lobby'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveBtn} onPress={onLeaveRoom}>
          <Text style={styles.leaveTxt}>Leave Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#e8f8ff',
    borderWidth: 3,
    borderColor: '#0984e3',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  title: { fontWeight: '900', fontSize: 16, color: '#1a5276', marginBottom: 4 },
  line: { fontWeight: '800', fontSize: 14, color: '#2d3436', marginBottom: 2 },
  mon: { fontWeight: '700', fontSize: 13, color: '#636e72', marginBottom: 4 },
  battle: { fontWeight: '900', fontSize: 14, color: '#c0392b', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  openBtn: {
    flex: 1,
    backgroundColor: '#74b9ff',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
  },
  openTxt: { fontWeight: '900', fontSize: 14, color: '#1b1b2f' },
  leaveBtn: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
  },
  leaveTxt: { fontWeight: '900', fontSize: 14, color: '#fff' },
});
