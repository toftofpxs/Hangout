import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { useCart } from '../context/CartContext';
import { createBulkInscriptions } from '../services/inscriptionsService';
import { checkoutCartPayment, getPaymentStatus } from '../services/paymentsService';
import { colors, fonts, shadows } from '../theme';

export default function CartPaymentScreen({ navigation }) {
  const { items, removeManyFromCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statuses, setStatuses] = useState({});

  const refreshStatuses = useCallback(async () => {
    if (!items.length) {
      setStatuses({});
      return {};
    }

    const entries = await Promise.all(
      items.map(async (item) => {
        const status = await getPaymentStatus(item.id);
        return [Number(item.id), status];
      })
    );

    const statusMap = Object.fromEntries(entries);
    setStatuses(statusMap);
    return statusMap;
  }, [items]);

  useEffect(() => {
    let mounted = true;

    const loadStatuses = async () => {
      if (!items.length) {
        setLoading(false);
        return;
      }

      try {
        await refreshStatuses();
      } catch (err) {
        const message =
          err.response?.data?.message ||
          (err.request ? 'Impossible de charger les statuts de paiement.' : err.message);
        if (mounted) {
          Alert.alert('Erreur', message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStatuses();

    return () => {
      mounted = false;
    };
  }, [items.length, refreshStatuses]);

  const payableItems = useMemo(
    () => items.filter((item) => statuses[item.id]?.requiresPayment && !statuses[item.id]?.isPaid),
    [items, statuses]
  );

  const totalDue = useMemo(
    () => payableItems.reduce((sum, item) => sum + Number(statuses[item.id]?.amount ?? item.price ?? 0), 0),
    [payableItems, statuses]
  );

  const submitLabel = totalDue > 0 ? `Confirmer le paiement de ${totalDue.toFixed(2)} EUR` : 'Finaliser les inscriptions';

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      // Revalide les statuts juste avant de payer pour éviter un état client obsolète.
      const freshStatuses = await refreshStatuses();
      const payableEventIds = items
        .filter((item) => freshStatuses[item.id]?.requiresPayment && !freshStatuses[item.id]?.isPaid)
        .map((item) => Number(item.id));

      let paymentResult = { emailSent: false };
      if (payableEventIds.length > 0) {
        paymentResult = await checkoutCartPayment({
          event_ids: payableEventIds,
          confirmPayment: true,
        });
      }

      const inscriptionResult = await createBulkInscriptions(items.map((item) => Number(item.id)));
      const processedIds = [
        ...(inscriptionResult.registered || []).map((entry) => Number(entry.event_id)),
        ...(inscriptionResult.alreadyRegistered || []).map((entry) => Number(entry.event_id)),
      ];

      if (processedIds.length > 0) {
        removeManyFromCart(processedIds);
      }

      const failedList = inscriptionResult.failed || [];

      if (paymentResult.emailSent) {
        Alert.alert('Succès', 'Paiement du panier validé. Email de confirmation envoyé.');
      } else if ((inscriptionResult.registered || []).length > 0 || (inscriptionResult.alreadyRegistered || []).length > 0) {
        Alert.alert('Succès', 'Panier validé et inscriptions finalisées.');
      }

      if (failedList.length > 0) {
        const failedIds = failedList.map((entry) => Number(entry.event_id));
        const failedTitles = items
          .filter((item) => failedIds.includes(Number(item.id)))
          .map((item) => item.title)
          .join(', ');

        Alert.alert(
          'Finalisation partielle',
          failedTitles
            ? `Certains événements n'ont pas pu être finalisés: ${failedTitles}`
            : 'Certains événements n\'ont pas pu être finalisés.'
        );
      }

      navigation.navigate('Cart');
    } catch (err) {
      const message = err.response?.data?.message || (err.request ? 'Erreur réseau pendant le paiement du panier.' : err.message);
      Alert.alert('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={colors.cyanBright} />
        <Text style={styles.loadingText}>Chargement du panier...</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <Text style={styles.emptyTitle}>Paiement du panier</Text>
        <Text style={styles.emptyText}>Votre panier est vide.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.primaryButtonText}>Retour au panier</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ScreenBackground />

      <View style={styles.panel}>
        <Text style={styles.title}>Paiement du panier</Text>
        <Text style={styles.subtitle}>Aucune donnée bancaire n'est stockée dans l'application. La validation ci-dessous confirme le paiement simulé du panier.</Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            En confirmant, vous validez un paiement unique pour les événements payants du panier puis la création des inscriptions associées.
          </Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Récapitulatif du panier</Text>

        {items.map((item) => {
          const status = statuses[item.id];
          const label = status?.isPaid ? 'Paiement déjà validé' : status?.requiresPayment ? 'Paiement requis' : 'Gratuit';

          return (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>{Number(item.price || 0).toFixed(2)} EUR</Text>
              <Text style={styles.itemStatus}>{label}</Text>
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total à régler maintenant</Text>
          <Text style={styles.totalValue}>{totalDue.toFixed(2)} EUR</Text>
        </View>
      </View>
    </ScrollView>
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
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shell,
    paddingHorizontal: 20,
  },
  loadingText: {
    color: colors.muted,
    marginTop: 10,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  emptyText: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 12,
    paddingHorizontal: 14,
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
    fontSize: 25,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 5,
    marginBottom: 12,
  },
  noticeBox: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  noticeText: {
    color: colors.success,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    fontFamily: fonts.heading,
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 9,
  },
  itemTitle: {
    color: colors.ink,
    fontWeight: '700',
  },
  itemMeta: {
    color: colors.muted,
    marginTop: 2,
  },
  itemStatus: {
    color: colors.inkSoft,
    marginTop: 2,
    fontSize: 12,
  },
  totalRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.ink,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
});
