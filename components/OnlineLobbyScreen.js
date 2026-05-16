import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { connectOnlineSocket } from '../utils/socketClient';

function socketUrlConfigured() {
  const u = Constants.expoConfig?.extra?.socketServerUrl ?? '';
  return typeof u === 'string' && u.length > 5;
}

/**
 * Optional online multiplayer lobby — offline modes unaffected when unused.
 */
export default function OnlineLobbyScreen({ onBack }) {
  const [status, setStatus] = useState(socketUrlConfigured() ? 'idle' : 'no_env');
  const [roomCode, setRoomCode] = useState('');
  const [log, setLog] = useState(/** @type {string[]} */ ([]));
  const socketRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        socketRef.current?.disconnect?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function push(line) {
    setLog((prev) => [...prev, line].slice(-12));
  }

  function handleCreateRoom() {
    if (!socketUrlConfigured()) {
      setStatus('no_env');
      return;
    }
    const { socket, error } = connectOnlineSocket();
    if (error || !socket) {
      setStatus('fail');
      push(error || 'Could not connect.');
      return;
    }
    socketRef.current?.disconnect?.();
    socketRef.current = socket;
    setStatus('connecting');
    socket.on('connect', () => {
      setStatus('connected');
      push('Connected — requesting room…');
      socket.emit('createRoom', {}, (res) => {
        if (res?.roomCode) {
          push(`Room ${res.roomCode} · slot ${res.playerSlot}`);
          setRoomCode(res.roomCode);
        } else push('Server did not return a room code.');
      });
    });
    socket.on('connect_error', () => {
      setStatus('fail');
      push('Online multiplayer server is not connected yet.');
    });
    socket.on('disconnect', () => push('Disconnected.'));
    socket.on('roomJoined', (payload) => push(`Joined ${payload?.roomCode ?? 'room'}`));
    socket.on('battleStarted', () => push('Battle started — UI sync is prototype-only.'));
    socket.on('errorMessage', (msg) => push(typeof msg === 'string' ? msg : 'Server error'));
  }

  function handleJoinRoom() {
    if (!socketUrlConfigured()) {
      setStatus('no_env');
      return;
    }
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      push('Enter a room code');
      return;
    }
    const { socket, error } = connectOnlineSocket();
    if (error || !socket) {
      setStatus('fail');
      push(error || 'Could not connect.');
      return;
    }
    socketRef.current?.disconnect?.();
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('joinRoom', { roomCode: code }, (res) => {
        if (res?.error) push(res.error);
        else push(`Joined room ${code}`);
      });
    });
    socket.on('connect_error', () => push('Online multiplayer server is not connected yet.'));
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Online Multiplayer</Text>
      <Text style={styles.note}>
        {status === 'no_env'
          ? 'Online multiplayer server is not configured yet. Set EXPO_PUBLIC_SOCKET_SERVER_URL and restart Expo.'
          : 'Experimental Socket.io lobby — battle sync is minimal; local modes remain the full game.'}
      </Text>

      <TouchableOpacity style={styles.btn} onPress={handleCreateRoom}>
        <Text style={styles.btnTxt}>Create Room</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="ROOM CODE"
        autoCapitalize="characters"
        value={roomCode}
        onChangeText={setRoomCode}
      />
      <TouchableOpacity style={styles.btnAlt} onPress={handleJoinRoom}>
        <Text style={styles.btnTxt}>Join Room</Text>
      </TouchableOpacity>

      <View style={styles.logBox}>
        {log.map((line, i) => (
          <Text key={`${i}-${line}`} style={styles.logLine}>
            • {line}
          </Text>
        ))}
      </View>

      <TouchableOpacity style={styles.back} onPress={onBack}>
        <Text style={styles.backTxt}>← Back Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  inner: { paddingVertical: 12, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '900', color: '#273043', textAlign: 'center', marginBottom: 8 },
  note: {
    fontWeight: '700',
    fontSize: 14,
    color: '#566573',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  btn: {
    backgroundColor: '#8ac926',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnAlt: {
    backgroundColor: '#74b9ff',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 14,
  },
  btnTxt: { fontWeight: '900', fontSize: 17, color: '#1b1b2f' },
  input: {
    borderWidth: 3,
    borderColor: '#ff9f1c',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '900',
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
  },
  logBox: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    padding: 10,
    minHeight: 90,
    marginBottom: 14,
  },
  logLine: { fontWeight: '700', fontSize: 13, color: '#2d3436', marginBottom: 4 },
  back: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffd166',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  backTxt: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
});
