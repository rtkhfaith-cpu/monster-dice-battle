import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getRoomPlayerCountLabel } from '../utils/onlineUserMessages';

/**
 * Compact online room status on the home screen — battle-lobby style.
 */
export default function OnlineRoomBanner({ roomState, mySlot, onOpenLobby, onLeaveRoom }) {
  if (!roomState?.roomCode) return null;

  const me = mySlot === 'p2' ? roomState.players?.p2 : roomState.players?.p1;
  const opp = mySlot === 'p2' ? roomState.players?.p1 : roomState.players?.p2;
  const bothJoined = !!roomState.bothJoined;
  const inBattle = roomState.status === 'battle';
  const leftMsg = roomState.lobbyMessage?.includes('left') ? roomState.lobbyMessage : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.liveDot}>●</Text>
        <Text style={styles.title}>Online · Room {roomState.roomCode}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillTxt}>{getRoomPlayerCountLabel(roomState)}</Text>
        </View>
      </View>
      <Text style={styles.line}>
        You: {me?.profile?.name ?? '—'}
        {me?.profile?.monsterName ? ` · ${me.profile.monsterName}` : ''}
      </Text>
      <Text style={styles.line}>
        {leftMsg
          ? leftMsg
          : !bothJoined
            ? '⏳ Waiting for opponent…'
            : `Opponent: ${opp?.profile?.name ?? 'Joined'}${
                opp?.profile?.monsterName ? ` · ${opp.profile.monsterName}` : ''
              }`}
      </Text>
      {inBattle ? <Text style={styles.battle}>⚔ Battle in progress — tap to rejoin</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.openBtn} onPress={onOpenLobby}>
          <Text style={styles.openTxt}>{inBattle ? 'Rejoin' : 'Open Lobby'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveBtn} onPress={onLeaveRoom}>
          <Text style={styles.leaveTxt}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(232, 244, 255, 0.98)',
    borderWidth: 2,
    borderColor: '#0984e3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0984e3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: { color: '#2ecc71', fontWeight: '900', fontSize: 12 },
  title: { fontWeight: '900', fontSize: 15, color: '#1a5276', flexShrink: 1 },
  countPill: {
    backgroundColor: '#0984e3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#2d2d44',
  },
  countPillTxt: { fontWeight: '900', fontSize: 12, color: '#fff' },
  line: { fontWeight: '800', fontSize: 13, color: '#2d3436', marginBottom: 3 },
  battle: { fontWeight: '900', fontSize: 13, color: '#c0392b', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  openBtn: {
    flex: 1,
    backgroundColor: '#74b9ff',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
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
    minHeight: 44,
    justifyContent: 'center',
  },
  leaveTxt: { fontWeight: '900', fontSize: 14, color: '#fff' },
});
