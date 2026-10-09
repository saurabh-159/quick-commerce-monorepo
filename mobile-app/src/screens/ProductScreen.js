import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../services/api';
import { formatRupees } from '../utils/format';

export default function ProductScreen({ route, navigation }) {
  const { product, storeId } = route.params;

  const addToCart = async () => {
    try {
      await api.post('/cart/items', {
        productId: product.id,
        storeId,
        qty: 1
      });
      Alert.alert('Added', `${product.name} added to cart`, [
        { text: 'Keep browsing', style: 'cancel' },
        { text: 'Go to cart', onPress: () => navigation.navigate('Cart', { screen: 'CartMain' }) }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not add to cart');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.meta}>
        {product.brand || 'Brand'} · {product.unit}
      </Text>
      <Text style={styles.desc}>{product.description || 'No description'}</Text>
      <Text style={styles.price}>{formatRupees(product.sellingPricePaise)}</Text>
      <Text style={styles.stock}>In stock: {product.stock}</Text>

      <TouchableOpacity style={styles.button} onPress={addToCart}>
        <Text style={styles.buttonText}>Add to cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 6 },
  desc: { marginTop: 16, color: '#334155', lineHeight: 22 },
  price: { marginTop: 20, fontSize: 22, fontWeight: '800', color: '#0f766e' },
  stock: { marginTop: 6, color: '#64748b' },
  button: {
    marginTop: 28,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
