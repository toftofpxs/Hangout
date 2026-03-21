import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../api/axios';
import ScreenBackground from '../components/ScreenBackground';
import { useAuth } from '../context/AuthContext';
import { checkoutEventPayment, getPaymentStatus } from '../services/paymentsService';
import { formatDate } from '../utils/formatDate';
import { colors, fonts, shadows } from '../theme';

export default function EventPaymentScreen({ route, navigation }) {
  const eventId = Number(route.params?.eventId);
  const { userData } = useAuth();

  const [event, setEvent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    cardholder_name: userData?.name || '',
    card_number: '4242 4242 4242 4242',
    expiry: '12/30',
    cvc: '123',
  });

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
      return `Payer ${price.toFixed(2)} EUR`;
    }
    return 'Finaliser mon inscription';
  }, [event?.price, paymentStatus?.isPaid, paymentStatus?.requiresPayment]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
          cardholder_name: form.cardholder_name,
          card_number: form.card_number,
          expiry: form.expiry,
          cvc: form.cvc,
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
        <Text style={styles.subtitle}>Complétez ce formulaire pour valider votre inscription.</Text>

        <TextInput
          style={styles.input}
          placeholder="Nom du porteur"
          value={form.cardholder_name}
          onChangeText={(value) => updateField('cardholder_name', value)}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Numéro de carte"
          value={form.card_number}
          onChangeText={(value) => updateField('card_number', value)}
          keyboardType="number-pad"
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Expiration"
            value={form.expiry}
            onChangeText={(value) => updateField('expiry', value)}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="CVC"
            value={form.cvc}
            onChangeText={(value) => updateField('cvc', value)}
            keyboardType="number-pad"
          />
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
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    fontFamily: fonts.heading,
  },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
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
