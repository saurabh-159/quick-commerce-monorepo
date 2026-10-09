import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { logout } from '../services/auth';
import { disconnectSocket } from '../services/socket';
import { formatRupees, statusLabel } from '../utils/format';
import { resetToLogin } from '../utils/navigation';

export default function RiderDashboard({ navigation }) {
  const [online, setOnline] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const locationTimer = useRef(null);

  const loadAssignments = async () => {
    try {
      const { data } = await api.get('/rider/assignments');
      setAssignments(data.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const pushLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      await api.patch('/rider/location', {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude
      });
    } catch (err) {
      console.log('Location update failed', err.message);
    }
  };

  const startLocationLoop = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location needed', 'Riders must share location while online.');
      return false;
    }
    await pushLocation();
    if (locationTimer.current) clearInterval(locationTimer.current);
    locationTimer.current = setInterval(pushLocation, 8000);
    return true;
  };

  const stopLocationLoop = () => {
    if (locationTimer.current) {
      clearInterval(locationTimer.current);
      locationTimer.current = null;
    }
  };

  const toggleOnline = async (value) => {
    try {
      if (value) {
        const ok = await startLocationLoop();
        if (!ok) return;
      } else {
        stopLocationLoop();
      }
      await api.patch('/rider/online', { isOnline: value });
      setOnline(value);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update online status');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAssignments();
      connectSocket().then((socket) => {
        if (!socket) return;
        const refresh = () => loadAssignments();
        socket.on('order:assigned', refresh);
        socket.on('order:status', refresh);
      });

      return () => {
        const s = getSocket();
        if (s) {
          s.off('order:assigned');
          s.off('order:status');
        }
      };
    }, [])
  );

  useEffect(() => {
    return () => stopLocationLoop();
  }, []);

  const onLogout = async () => {
    stopLocationLoop();
    if (online) {
      try {
        await api.patch('/rider/online', { isOnline: false });
      } catch {
        // ignore
      }
    }
    disconnectSocket();
    await logout();
    resetToLogin(navigation);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rider Dashboard</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.onlineRow}>
        <Text style={styles.onlineLabel}>{online ? 'Online' : 'Offline'}</Text>
        <Switch
          value={online}
          onValueChange={toggleOnline}
          trackColor={{ true: '#0f766e', false: '#cbd5e1' }}
        />
      </View>
      <Text style={styles.hint}>Location syncs every 8s while online.</Text>

      <Text style={styles.section}>Active assignments</Text>
      <FlatList
        data={assignments}
        keyExtractor={(item) => String(item._id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadAssignments} />}
        ListEmptyComponent={<Text style={styles.empty}>No active assignments.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RiderOrder', { orderId: item._id })}
          >
            <Text style={styles.number}>{item.orderNumber}</Text>
            <Text style={styles.status}>{statusLabel(item.status)}</Text>
            <Text style={styles.meta}>
              {formatRupees(item.pricing?.grandTotal)} · ETA {item.etaMinutes || '-'} min
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  logout: { color: '#b91c1c', fontWeight: '700' },
  onlineRow: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  onlineLabel: { fontWeight: '700', fontSize: 16 },
  hint: { color: '#94a3b8', marginTop: 6, marginBottom: 12 },
  section: { fontWeight: '700', marginBottom: 8, color: '#334155' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  number: { fontWeight: '800', fontSize: 16 },
  status: { marginTop: 4, color: '#0f766e', fontWeight: '600', textTransform: 'capitalize' },
  meta: { marginTop: 4, color: '#64748b' }
});
