import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { buildTopTrainerRankings } from '../utils/trainerRankings';

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

function rankLabel(rank) {
  return rank <= 3 ? RANK_MEDAL[rank - 1] : `#${rank}`;
}

export default function TrainerRankingsModal({
  visible,
  onClose,
  localProfile,
  localProfileId,
  cloudPlayers = [],
  cloudFetchLoading = false,
  cloudFetchError = null,
  onRefresh,
}) {
  const { rows, yourRank } = useMemo(
    () => buildTopTrainerRankings({ localProfile, localProfileId, cloudPlayers }),
    [localProfile, localProfileId, cloudPlayers],
  );

  const youInTopTen = rows.some((r) => r.isYou);
  const subtitle = cloudFetchError
    ? 'Showing this device only — cloud rankings unavailable.'
    : rows.length
      ? 'Ranked by each trainer’s highest monster level.'
      : 'Play and level up a monster to appear here.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Hall of Fame</Text>
          <Text style={styles.sub}>{subtitle}</Text>

          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.thRank]}>Rank</Text>
            <Text style={[styles.th, styles.thName]}>Trainer</Text>
            <Text style={[styles.th, styles.thMonster]}>Monster</Text>
            <Text style={[styles.th, styles.thLv]}>Lv</Text>
          </View>

          {cloudFetchLoading && rows.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#ffe6a3" />
              <Text style={styles.loadingTxt}>Loading rankings…</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {rows.length === 0 ? (
                <Text style={styles.empty}>No trainers ranked yet.</Text>
              ) : (
                rows.map((row) => (
                  <View
                    key={row.profileID}
                    style={[styles.row, row.isYou && styles.rowYou]}
                  >
                    <Text style={[styles.cell, styles.cellRank]}>{rankLabel(row.rank)}</Text>
                    <Text style={[styles.cell, styles.cellName]} numberOfLines={1}>
                      {row.playerName}
                      {row.isYou ? ' (you)' : ''}
                    </Text>
                    <Text style={[styles.cell, styles.cellMonster]} numberOfLines={1}>
                      {row.monsterName}
                    </Text>
                    <Text style={[styles.cell, styles.cellLv]}>{row.level}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {yourRank && !youInTopTen ? (
            <Text style={styles.yourRank}>Your rank: #{yourRank}</Text>
          ) : null}

          <View style={styles.actions}>
            {onRefresh ? (
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={cloudFetchLoading}>
                <Text style={styles.refreshTxt}>{cloudFetchLoading ? 'Refreshing…' : 'Refresh'}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 24, 0.88)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    maxHeight: '82%',
    backgroundColor: 'rgba(18, 12, 32, 0.98)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 224, 143, 0.75)',
    padding: 18,
  },
  title: {
    fontWeight: '900',
    fontSize: 22,
    color: '#ffe6a3',
    textAlign: 'center',
  },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    fontWeight: '700',
    fontSize: 12,
    color: '#93c5fd',
    textAlign: 'center',
    lineHeight: 17,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 224, 143, 0.35)',
  },
  th: {
    fontWeight: '900',
    fontSize: 11,
    color: '#fde68a',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  thRank: { width: 44 },
  thName: { flex: 1.1 },
  thMonster: { flex: 1 },
  thLv: { width: 36, textAlign: 'right' },
  list: { maxHeight: 320 },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingTxt: { color: '#cbd5e1', fontWeight: '800', fontSize: 13 },
  empty: {
    color: '#94a3b8',
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
  },
  rowYou: {
    backgroundColor: 'rgba(219, 39, 119, 0.18)',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  cell: {
    fontWeight: '800',
    fontSize: 13,
    color: '#f8fafc',
  },
  cellRank: { width: 44, fontSize: 15 },
  cellName: { flex: 1.1 },
  cellMonster: { flex: 1, color: '#cbd5e1', fontWeight: '700' },
  cellLv: { width: 36, textAlign: 'right', color: '#86efac', fontWeight: '900' },
  yourRank: {
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 13,
    color: '#f9a8d4',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  refreshBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 143, 0.45)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshTxt: { color: '#ffe6a3', fontWeight: '900', fontSize: 14 },
  closeBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#db2777',
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
