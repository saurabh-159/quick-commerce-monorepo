import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';

import { getStoredSession, logout } from '../services/auth';
import { disconnectSocket } from '../services/socket';
import { resetToLogin } from '../utils/navigation';

import LoginScreen from '../screens/LoginScreen';
import CustomerHome from '../screens/CustomerHome';
import ProductScreen from '../screens/ProductScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderTrackScreen from '../screens/OrderTrackScreen';
import RiderDashboard from '../screens/RiderDashboard';
import RiderOrderScreen from '../screens/RiderOrderScreen';

const RootStack = createNativeStackNavigator();
const CustomerStack = createNativeStackNavigator();
const RiderStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CustomerHomeStack() {
  return (
    <CustomerStack.Navigator>
      <CustomerStack.Screen
        name="Home"
        component={CustomerHome}
        options={({ navigation }) => ({
          title: 'QuickCommerce',
          headerRight: () => (
            <TouchableOpacity
              onPress={async () => {
                disconnectSocket();
                await logout();
                resetToLogin(navigation);
              }}
              style={{ marginRight: 4 }}
            >
              <Text style={{ color: '#b91c1c', fontWeight: '700' }}>Logout</Text>
            </TouchableOpacity>
          )
        })}
      />
      <CustomerStack.Screen name="Product" component={ProductScreen} options={{ title: 'Product' }} />
    </CustomerStack.Navigator>
  );
}

function CustomerCartStack() {
  return (
    <CustomerStack.Navigator>
      <CustomerStack.Screen name="CartMain" component={CartScreen} options={{ title: 'Cart' }} />
      <CustomerStack.Screen name="Checkout" component={CheckoutScreen} />
      <CustomerStack.Screen
        name="OrderTrack"
        component={OrderTrackScreen}
        options={{ title: 'Track order' }}
      />
    </CustomerStack.Navigator>
  );
}

function CustomerOrdersStack() {
  return (
    <CustomerStack.Navigator>
      <CustomerStack.Screen name="OrdersMain" component={OrdersScreen} options={{ title: 'Orders' }} />
      <CustomerStack.Screen
        name="OrderTrack"
        component={OrderTrackScreen}
        options={{ title: 'Track order' }}
      />
    </CustomerStack.Navigator>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f766e'
      }}
    >
      <Tab.Screen name="Browse" component={CustomerHomeStack} />
      <Tab.Screen name="Cart" component={CustomerCartStack} />
      <Tab.Screen name="Orders" component={CustomerOrdersStack} />
    </Tab.Navigator>
  );
}

function RiderStackNavigator() {
  return (
    <RiderStack.Navigator>
      <RiderStack.Screen
        name="RiderHome"
        component={RiderDashboard}
        options={{ title: 'Rider' }}
      />
      <RiderStack.Screen
        name="RiderOrder"
        component={RiderOrderScreen}
        options={{ title: 'Assignment' }}
      />
    </RiderStack.Navigator>
  );
}

export default function RootNavigation() {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    (async () => {
      const session = await getStoredSession();
      if (session.accessToken && session.role === 'delivery_partner') {
        setInitialRoute('RiderStack');
      } else if (session.accessToken && session.role === 'customer') {
        setInitialRoute('CustomerTabs');
      } else {
        setInitialRoute('Login');
      }
      setBooting(false);
    })();
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="CustomerTabs" component={CustomerTabs} />
        <RootStack.Screen name="RiderStack" component={RiderStackNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
