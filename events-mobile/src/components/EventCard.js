import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDate, formatPrice } from '../utils/formatDate';
import { colors, fonts, shadows } from '../theme';

export default function EventCard({ event, onPress, onAddToCart, inCart = false, disabled = false }) {
  const free = parseFloat(event.price || 0) === 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.topMeta}>
        <Text style={styles.metaChip}>Hangout</Text>
        <Text style={[styles.price, free ? styles.priceFree : null]}>{formatPrice(event.price)}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {event.description || 'Aucune description'}
      </Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoTile}>
          <Text style={styles.infoLabel}>Lieu</Text>
          <Text style={styles.infoText}>{event.location || 'Non précisé'}</Text>
        </View>
        <View style={styles.infoTile}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoText}>{formatDate(event.date)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.linkText}>Voir l’événement</Text>
        <Text style={styles.linkArrow}>+</Text>
      </View>

      {onAddToCart ? (
        <TouchableOpacity
          style={[styles.cartButton, inCart ? styles.cartButtonIn : null]}
          onPress={onAddToCart}
          disabled={disabled}
        >
          <Text style={[styles.cartButtonText, inCart ? styles.cartButtonTextIn : null]}>
            {inCart ? 'Déjà dans le panier' : 'Ajouter au panier'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panelStrong,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaChip: {
    color: colors.cyan,
    backgroundColor: colors.skySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.heading,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
    letterSpacing: -0.4,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cyan,
    backgroundColor: colors.skySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    overflow: 'hidden',
  },
  priceFree: {
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
  description: {
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 22,
    marginBottom: 14,
  },
  infoGrid: {
    gap: 10,
  },
  infoTile: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoText: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
  },
  linkText: {
    color: colors.ink,
    fontWeight: '700',
    fontFamily: fonts.heading,
  },
  linkArrow: {
    color: colors.cyan,
    fontSize: 22,
    fontWeight: '800',
  },
  cartButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },
  cartButtonIn: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  cartButtonText: {
    color: colors.ink,
    fontWeight: '700',
  },
  cartButtonTextIn: {
    color: colors.success,
  },
});
