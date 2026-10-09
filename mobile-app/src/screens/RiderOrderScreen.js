import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import api from '../services/api';
import { connectSocket, joinOrderRoom, getSocket } from '../services/socket';
import { formatRupees, nextRiderStatus, statusLabel } from '../utils/format';

export default function RiderOrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      const socket = await connectSocket();
      if (!socket) return;
      joinOrderRoom(orderId);
      const onUpdate = (payload) => {
        if (payload?.status) load();
      };
      socket.on('order:status', onUpdate);
      socket.on('order:update', onUpdate);
    })();

    return () => {
      const s = getSocket();
      if (s) {
        s.off('order:status');
        s.off('order:update');
      }
    };
  }, [orderId]);

  const advanceStatus = async () => {
    const next = nextRiderStatus(order.status);
    if (!next) {
      Alert.alert('Done', 'No further status updates.');
      return;
    }
    setUpdating(true);
    try {
      const { data } = await api.post(`/rider/orders/${orderId}/status`, { status: next });
      setOrder(data.data);
      if (next === 'delivered') {
        Alert.alert('Delivered', 'Order marked as delivered.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Status update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  const next = nextRiderStatus(order.status);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{order.orderNumber}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{statusLabel(order.status)}</Text>
      </View>

      <Text style={styles.label}>Drop address</Text>
      <Text style={styles.value}>
        {order.addressSnapshot?.line1}, {order.addressSnapshot?.city}{' '}
        {order.addressSnapshot?.pincode}
      </Text>

      <Text style={styles.label}>Payable</Text>
      <Text style={styles.value}>{formatRupees(order.pricing?.grandTotal)}</Text>

      <Text style={styles.label}>Items</Text>
      {(order.items || []).map((item, idx) => (
        <Text key={idx} style={styles.item}>
          {item.name} × {item.qty}
        </Text>
      ))}

      {next && (
        <TouchableOpacity style={styles.button} onPress={advanceStatus} disabled={updating}>
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Mark as {statusLabel(next)}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeText: { color: '#0f766e', fontWeight: '700', textTransform: 'capitalize' },
  label: { marginTop: 18, color: '#64748b', fontWeight: '600' },
  value: { marginTop: 4, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  item: { marginTop: 4, color: '#334155' },
  button: {
    marginTop: 28,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '700', textTransform: 'capitalize' }
});
