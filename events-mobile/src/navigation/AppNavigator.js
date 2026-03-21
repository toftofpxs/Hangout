import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EventsListScreen from '../screens/EventsListScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import EventFormScreen from '../screens/EventFormScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminEventsScreen from '../screens/AdminEventsScreen';
import EventPaymentScreen from '../screens/EventPaymentScreen';
import CartScreen from '../screens/CartScreen';
import CartPaymentScreen from '../screens/CartPaymentScreen';
import { colors, fonts } from '../theme';

const Stack = createNativeStackNavigator();
const BYPASS_AUTH = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { itemCount } = useCart();

  const cartLabel = itemCount > 0 ? `Panier (${itemCount})` : 'Panier';

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.shell },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: {
          fontWeight: '800',
          fontFamily: fonts.heading,
        },
        contentStyle: { backgroundColor: colors.shell },
        headerRight: ({ tintColor }) => (
          <TouchableOpacity style={styles.cartChip} onPress={() => navigation.navigate('Cart')}>
            <Text style={[styles.cartChipText, { color: tintColor || colors.ink }]}>{cartLabel}</Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen
        name="EventsList"
        component={EventsListScreen}
        options={{ headerShown: false, title: 'Hangout' }}
      />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Détail' }} />
      <Stack.Screen name="EventPayment" component={EventPaymentScreen} options={{ title: 'Paiement événement' }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Mon panier' }} />
      <Stack.Screen name="CartPayment" component={CartPaymentScreen} options={{ title: 'Paiement panier' }} />
      <Stack.Screen name="EventForm" component={EventFormScreen} options={{ title: 'Nouvel événement' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Gestion des utilisateurs' }} />
      <Stack.Screen name="AdminEvents" component={AdminEventsScreen} options={{ title: 'Gestion des événements' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { userToken, isLoading } = useAuth();

  if (BYPASS_AUTH) {
    return <NavigationContainer><AppStack /></NavigationContainer>;
  }

  if (isLoading) return <SplashScreen />;

  return <NavigationContainer>{userToken ? <AppStack /> : <AuthStack />}</NavigationContainer>;
}

const styles = StyleSheet.create({
  cartChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.panel,
  },
  cartChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
