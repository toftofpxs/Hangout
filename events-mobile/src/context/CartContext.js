import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'event-cart';
const CartContext = createContext(null);

function normalizeEvent(event) {
  return {
    id: Number(event.id),
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    date: event.date,
    end_date: event.end_date || event.date,
    price: Number(event.price || 0),
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !mounted) {
          return;
        }

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => undefined);
  }, [hydrated, items]);

  const addToCart = useCallback((event) => {
    if (!event?.id) return false;
    const normalized = normalizeEvent(event);

    let added = false;
    setItems((prev) => {
      if (prev.some((item) => Number(item.id) === normalized.id)) {
        return prev;
      }
      added = true;
      return [...prev, normalized];
    });

    return added;
  }, []);

  const removeFromCart = useCallback((eventId) => {
    const targetId = Number(eventId);
    setItems((prev) => prev.filter((item) => Number(item.id) !== targetId));
  }, []);

  const removeManyFromCart = useCallback((eventIds) => {
    const idSet = new Set((eventIds || []).map((value) => Number(value)));
    setItems((prev) => prev.filter((item) => !idSet.has(Number(item.id))));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback((eventId) => {
    const targetId = Number(eventId);
    return items.some((item) => Number(item.id) === targetId);
  }, [items]);

  const value = useMemo(() => ({
    items,
    hydrated,
    itemCount: items.length,
    totalPrice: items.reduce((sum, item) => sum + Number(item.price || 0), 0),
    addToCart,
    removeFromCart,
    removeManyFromCart,
    clearCart,
    isInCart,
  }), [addToCart, clearCart, hydrated, isInCart, items, removeFromCart, removeManyFromCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
