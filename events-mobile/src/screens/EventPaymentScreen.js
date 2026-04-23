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
import API from '../api/axios';
import ScreenBackground from '../components/ScreenBackground';
import { checkoutEventPayment, getPaymentStatus } from '../services/paymentsService';
import { formatDate } from '../utils/formatDate';
import { colors, fonts, shadows } from '../theme';

export default function EventPaymentScreen({ route, navigation }) {
  const eventId = Number(route.params?.eventId);

  const [event, setEvent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPage = useCallback(async () => {
    if (!eventId) {
      Alert.alert('Erreur', 'Identifiant événement invalide.');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const [eventResponse, statusResponse] = await Promise.all([
        API.get(`/events/${eventId}`),
        getPaymentStatus(eventId),
      ]);

      setEvent(eventResponse.data);
      setPaymentStatus(statusResponse);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.request ? 'Impossible de joindre le serveur.' : err.message);
      Alert.alert('Erreur', message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [eventId, navigation]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const submitLabel = useMemo(() => {
    const price = Number(event?.price || 0);
    if (paymentStatus?.requiresPayment && !paymentStatus?.isPaid) {
      return `Confirmer le paiement de ${price.toFixed(2)} EUR`;
    }
    return 'Finaliser mon inscription';
  }, [event?.price, paymentStatus?.isPaid, paymentStatus?.requiresPayment]);

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      const freshStatus = await getPaymentStatus(eventId);
      setPaymentStatus(freshStatus);

      let paymentResult = { emailSent: false };
      if (freshStatus?.requiresPayment && !freshStatus?.isPaid) {
        paymentResult = await checkoutEventPayment({
          event_id: eventId,
          confirmPayment: true,
        });
      }

      await API.post('/inscriptions', { event_id: eventId });

      if (paymentResult.emailSent) {
        Alert.alert('Succès', 'Paiement validé + inscription confirmée. Email de confirmation envoyé.');
      } else {
        Alert.alert('Succès', 'Paiement validé + inscription confirmée.');
      }

      navigation.navigate('EventDetail', { eventId, refreshedAt: Date.now() });
    } catch (err) {
      const statusCode = err.response?.status;
      const backendMessage = err.response?.data?.message;

      if (statusCode === 402) {
        Alert.alert('Paiement requis', 'Paiement requis avant inscription.');
        return;
      }

      Alert.alert('Erreur', backendMessage || (err.request ? 'Erreur réseau pendant le paiement.' : err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={colors.cyanBright} />
        <Text style={styles.loadingText}>Chargement du paiement...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <Text style={styles.errorText}>Événement introuvable.</Text>
      </View>
    );
  }

  const paymentPending = paymentStatus?.requiresPayment && !paymentStatus?.isPaid;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ScreenBackground />

      <View style={styles.panel}>
        <Text style={styles.title}>Paiement de l'événement</Text>
        <Text style={styles.subtitle}>Aucune donnée bancaire n'est stockée dans l'application. La validation ci-dessous confirme simplement le paiement simulé.</Text>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            En confirmant, vous validez le règlement de cet événement avant la création de votre inscription.
          </Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Récapitulatif</Text>
        <InfoRow label="Événement" value={event.title} />
        <InfoRow label="Lieu" value={event.location || 'Non précisé'} />
        <InfoRow label="Date" value={formatDate(event.date)} />
        <InfoRow label="Montant" value={`${Number(event.price || 0).toFixed(2)} EUR`} />
        <InfoRow
          label="Statut"
          value={paymentStatus?.isPaid ? 'Paiement déjà validé' : paymentPending ? 'Paiement en attente' : 'Aucun paiement requis'}
        />
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shell,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.muted,
  },
  errorText: {
    color: colors.ink,
    fontSize: 16,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 6,
    marginBottom: 14,
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
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    fontFamily: fonts.heading,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  infoLabel: {
    color: colors.muted,
    fontWeight: '600',
    marginRight: 12,
  },
  infoValue: {
    color: colors.ink,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
});
