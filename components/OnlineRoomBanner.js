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
    backgroundColor: 'rgba(11, 24, 48, 0.94)',
    borderWidth: 2,
    borderColor: '#b9843b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
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
  title: { fontWeight: '900', fontSize: 15, color: '#fff4cf', flexShrink: 1 },
  countPill: {
    backgroundColor: 'rgba(92, 57, 143, 0.96)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#d8b4fe',
  },
  countPillTxt: { fontWeight: '900', fontSize: 12, color: '#fff' },
  line: { fontWeight: '800', fontSize: 13, color: '#bfdbfe', marginBottom: 3 },
  battle: { fontWeight: '900', fontSize: 13, color: '#fcd34d', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  openBtn: {
    flex: 1,
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#efd17a',
    borderBottomWidth: 4,
    borderBottomColor: '#31551f',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  openTxt: { fontWeight: '900', fontSize: 14, color: '#fff8dd' },
  leaveBtn: {
    flex: 1,
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fecaca',
    borderBottomWidth: 4,
    borderBottomColor: '#450a0a',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  leaveTxt: { fontWeight: '900', fontSize: 14, color: '#fff' },
});
