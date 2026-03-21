import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'event-cart'
const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setItems(parsed)
      }
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addToCart = (event) => {
    const normalized = {
      id: Number(event.id),
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      date: event.date,
      end_date: event.end_date || event.date,
      price: Number(event.price || 0),
    }

    let added = false
    setItems((prev) => {
      if (prev.some((item) => item.id === normalized.id)) return prev
      added = true
      return [...prev, normalized]
    })
    return added
  }

  const removeFromCart = (eventId) => {
    setItems((prev) => prev.filter((item) => item.id !== Number(eventId)))
  }

  const removeManyFromCart = (eventIds) => {
    const ids = new Set(eventIds.map((value) => Number(value)))
    setItems((prev) => prev.filter((item) => !ids.has(Number(item.id))))
  }

  const clearCart = () => {
    setItems([])
  }

  const isInCart = (eventId) => items.some((item) => item.id === Number(eventId))

  const itemCount = items.length
  const totalPrice = items.reduce((sum, item) => sum + Number(item.price || 0), 0)

  const value = useMemo(() => ({
    items,
    itemCount,
    totalPrice,
    addToCart,
    removeFromCart,
    removeManyFromCart,
    clearCart,
    isInCart,
  }), [items, itemCount, totalPrice])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
