import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../services/api';
import { formatRupees } from '../utils/format';

export default function CustomerHome({ navigation }) {
  const [store, setStore] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Allow location to find a nearby dark store.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = loc.coords;

      const nearby = await api.get('/stores/nearby', { params: { lat, lng } });
      const nearest = nearby.data.data;
      setStore(nearest.store);
      setDistanceKm(nearest.distanceKm);

      const catalog = await api.get('/catalog/products', {
        params: { storeId: nearest.store._id }
      });
      setProducts(catalog.data.data || []);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load store';
      Alert.alert('Error', message);
      setStore(null);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const addToCart = async (product) => {
    try {
      await api.post('/cart/items', {
        productId: product.id,
        storeId: store._id,
        qty: 1
      });
      Alert.alert('Added', `${product.name} added to cart`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not add to cart');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.muted}>Finding nearby store…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse</Text>
        {store ? (
          <Text style={styles.store}>
            {store.name} · {Number(distanceKm || 0).toFixed(1)} km
          </Text>
        ) : (
          <Text style={styles.store}>No store in range</Text>
        )}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No products available.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Product', { product: item, storeId: store._id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.unit} · Stock {item.stock}
              </Text>
              <Text style={styles.price}>{formatRupees(item.sellingPricePaise)}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { marginTop: 10, color: '#64748b' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  store: { color: '#0f766e', marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 2 },
  price: { marginTop: 6, fontWeight: '700', color: '#0f766e' },
  addBtn: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  addText: { color: '#fff', fontWeight: '700' }
});
