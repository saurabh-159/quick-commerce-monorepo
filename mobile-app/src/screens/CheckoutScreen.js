import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';

export default function CheckoutScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/addresses');
        const list = data.data || [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setSelected(def._id);
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load addresses');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createQuickAddress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Allow location to create a delivery address.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = loc.coords;
      const { data } = await api.post('/addresses', {
        label: 'Home',
        line1: 'Current location',
        city: 'City',
        state: 'State',
        pincode: '110001',
        lat,
        lng,
        isDefault: true
      });
      const addr = data.data;
      setAddresses((prev) => [addr, ...prev]);
      setSelected(addr._id);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not create address');
    }
  };

  const placeOrder = async () => {
    if (!selected) {
      Alert.alert('Address required', 'Select or create a delivery address.');
      return;
    }
    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        addressId: selected,
        paymentMethod
      });
      const order = data.data;

      if (paymentMethod === 'online') {
        await api.post('/payments/online/mock-success', { orderId: order._id });
      }

      Alert.alert('Ordered', `Order ${order.orderNumber} placed`, [
        {
          text: 'Track',
          onPress: () => navigation.replace('OrderTrack', { orderId: order._id })
        }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Checkout failed');
    } finally {
      setPlacing(false);
    }
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
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.section}>Delivery address</Text>

      <FlatList
        data={addresses}
        keyExtractor={(item) => String(item._id)}
        ListEmptyComponent={<Text style={styles.empty}>No saved addresses yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, selected === item._id && styles.cardActive]}
            onPress={() => setSelected(item._id)}
          >
            <Text style={styles.name}>{item.label || 'Address'}</Text>
            <Text style={styles.line}>
              {item.line1}, {item.city} {item.pincode}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.secondary} onPress={createQuickAddress}>
        <Text style={styles.secondaryText}>+ Use current location as address</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Payment</Text>
      <View style={styles.row}>
        {['cod', 'online'].map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.payBtn, paymentMethod === method && styles.payActive]}
            onPress={() => setPaymentMethod(method)}
          >
            <Text style={[styles.payText, paymentMethod === method && styles.payTextActive]}>
              {method === 'cod' ? 'Cash on Delivery' : 'Online (mock)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={placeOrder} disabled={placing}>
        {placing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Place order</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  section: { fontWeight: '700', marginTop: 8, marginBottom: 8, color: '#334155' },
  empty: { color: '#94a3b8', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  name: { fontWeight: '700' },
  line: { color: '#64748b', marginTop: 2 },
  secondary: { paddingVertical: 10 },
  secondaryText: { color: '#0f766e', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  payBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff'
  },
  payActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  payText: { textAlign: 'center', color: '#64748b', fontWeight: '600' },
  payTextActive: { color: '#0f766e' },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
