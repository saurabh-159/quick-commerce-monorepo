import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { connectSocket, joinOrderRoom, getSocket } from '../services/socket';
import { formatRupees, statusLabel } from '../utils/format';

export default function OrderTrackScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data.data);
      setLiveStatus(data.data.status);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    let socket;
    (async () => {
      socket = await connectSocket();
      if (!socket) return;
      joinOrderRoom(orderId);

      const onUpdate = (payload) => {
        if (!payload) return;
        if (String(payload.orderId) === String(orderId) || payload.type?.startsWith('order:')) {
          if (payload.status) setLiveStatus(payload.status);
          load();
        }
      };

      socket.on('order:update', onUpdate);
      socket.on('order:assigned', onUpdate);
      socket.on('order:status', onUpdate);
    })();

    return () => {
      const s = getSocket();
      if (s) {
        s.off('order:update');
        s.off('order:assigned');
        s.off('order:status');
      }
    };
  }, [orderId]);

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{order.orderNumber}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{statusLabel(liveStatus || order.status)}</Text>
      </View>

      <Text style={styles.label}>Payable</Text>
      <Text style={styles.value}>{formatRupees(order.pricing?.grandTotal)}</Text>

      <Text style={styles.label}>Payment</Text>
      <Text style={styles.value}>{order.paymentMethod || '-'} · {order.paymentStatus || '-'}</Text>

      <Text style={styles.label}>Items</Text>
      {(order.items || []).map((item, idx) => (
        <Text key={idx} style={styles.item}>
          {item.name || item.product?.name || 'Item'} × {item.qty}
        </Text>
      ))}

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
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
  buttonText: { color: '#fff', fontWeight: '700' }
});
