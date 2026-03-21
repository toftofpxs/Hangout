import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { useCart } from '../context/CartContext';
import { formatDate } from '../utils/formatDate';
import { colors, fonts, shadows } from '../theme';

export default function CartScreen({ navigation }) {
  const { items, removeFromCart, totalPrice } = useCart();

  if (!items.length) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <Text style={styles.emptyTitle}>Mon panier</Text>
        <Text style={styles.emptyText}>Votre panier est vide.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('EventsList')}>
          <Text style={styles.primaryButtonText}>Voir les événements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ScreenBackground />

      <View style={styles.panel}>
        <Text style={styles.title}>Mon panier</Text>
        <Text style={styles.subtitle}>Ajoutez plusieurs événements puis payez en une seule fois.</Text>

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>{item.location || 'Lieu non précisé'} - {formatDate(item.date)}</Text>
              <Text style={styles.itemPrice}>
                {Number(item.price || 0) > 0 ? `${Number(item.price).toFixed(2)} EUR` : 'Gratuit'}
              </Text>
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.viewButton]}
                onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              >
                <Text style={styles.secondaryButtonText}>Voir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.removeButton]}
                onPress={() => removeFromCart(item.id)}
              >
                <Text style={[styles.secondaryButtonText, styles.removeText]}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Récapitulatif</Text>
        <InfoRow label="Événements" value={items.length} />
        <InfoRow label="Total du panier" value={`${Number(totalPrice || 0).toFixed(2)} EUR`} />

        <TouchableOpacity style={styles.payButton} onPress={() => navigation.navigate('CartPayment')}>
          <Text style={styles.payButtonText}>Payer le panier</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shell,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  emptyText: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  panel: {
    backgroundColor: colors.panelStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadows.card,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.panel,
    padding: 12,
    marginBottom: 10,
  },
  itemContent: {
    marginBottom: 10,
  },
  itemTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  itemMeta: {
    color: colors.muted,
    marginTop: 4,
  },
  itemPrice: {
    color: colors.ink,
    marginTop: 6,
    fontWeight: '700',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  viewButton: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  removeButton: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  secondaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  removeText: {
    color: colors.danger,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.heading,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    color: colors.muted,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.ink,
    fontWeight: '800',
  },
  payButton: {
    marginTop: 12,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
});
