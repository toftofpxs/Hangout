import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import API, { SERVER_BASE_URL } from '../api/axios';
import ScreenBackground from '../components/ScreenBackground';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { requestRefund } from '../services/paymentsService';
import { formatDate, formatPrice } from '../utils/formatDate';
import { showToast } from '../utils/toast';
import { colors, fonts, shadows } from '../theme';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const { userData } = useAuth();
  const { addToCart, isInCart } = useCart();
  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_user';
  const inCart = isInCart(eventId);

  const isPast = useMemo(() => {
    if (!event?.date) return false;
    return new Date(event.end_date || event.date) < new Date();
  }, [event]);

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.get(`/events/${eventId}`);
      setEvent(response.data);
      navigation.setOptions({ title: response.data.title || 'Détail' });

      try {
        const myInscriptions = await API.get('/inscriptions/me');
        const list = [
          ...(myInscriptions.data?.enCours || []),
          ...(myInscriptions.data?.passes || []),
        ];
        const already = list.some(
          (ins) => Number(ins.event_id) === Number(eventId)
        );
        setIsRegistered(already);
      } catch {
        setIsRegistered(false);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Événement introuvable');
      } else if (err.response) {
        setError(
          err.response.data?.message ||
            `Erreur serveur (${err.response.status})`
        );
      } else if (err.request) {
        setError('Impossible de joindre le serveur');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, navigation]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvent();
    });
    return unsubscribe;
  }, [navigation, fetchEvent]);

  const handleRegister = async () => {
    if (registering || isRegistered || isPast) return;

    const eventPrice = Number(event?.price || 0);
    if (Number.isFinite(eventPrice) && eventPrice > 0) {
      navigation.navigate('EventPayment', { eventId: Number(eventId) });
      return;
    }

    setRegistering(true);
    try {
      await API.post('/inscriptions', { event_id: eventId });
      setIsRegistered(true);
      Alert.alert('Succès', 'Inscription confirmée');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 409) {
        setIsRegistered(true);
        Alert.alert('Info', message || 'Déjà inscrit');
      } else if (status === 402) {
        Alert.alert('Paiement requis', 'Paiement requis avant inscription.');
      } else if (status === 400) {
        Alert.alert('Erreur', message || 'Requête invalide');
      } else if (status === 401 || status === 403) {
        Alert.alert('Session', 'Reconnectez-vous');
      } else if (status === 404) {
        Alert.alert('Erreur', 'Événement introuvable');
      } else if (err.request) {
        Alert.alert('Réseau', 'Impossible de joindre le serveur');
      } else {
        Alert.alert('Erreur', err.message);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleAddToCart = () => {
    if (!event?.id) return;
    const added = addToCart(event);
    if (added) {
      showToast('Événement ajouté au panier.');
      return;
    }
    showToast('Cet événement est déjà dans votre panier.');
  };

  const handleUnregister = () => {
    const eventPrice = Number(event?.price || 0);
    const isPaidEvent = Number.isFinite(eventPrice) && eventPrice > 0;

    Alert.alert('Désinscription', isPaidEvent
      ? `Un remboursement de ${eventPrice.toFixed(2)} euros sera traité sous 48h.`
      : 'Voulez-vous annuler votre inscription ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        style: 'destructive',
        onPress: async () => {
          try {
            let refundResult = null;
            if (isPaidEvent) {
              refundResult = await requestRefund(eventId);
            }
            await API.delete(`/inscriptions/by-event/${eventId}`);
            setIsRegistered(false);

            if (isPaidEvent && refundResult?.refundRequested) {
              const amount = Number(refundResult.amount || eventPrice).toFixed(2);
              showToast(`Désinscription effectuée. Remboursement de ${amount} euros en cours sous 48h.`);
            } else {
              showToast('Désinscription effectuée.');
            }
          } catch (err) {
            const message =
              err.response?.data?.message || err.message || 'Erreur';
            Alert.alert('Erreur', message);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Supprimer l'\u00e9v\u00e9nement",
      'Cette action est irr\u00e9versible. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/events/${eventId}`);
              navigation.navigate('EventsList');
            } catch (err) {
              Alert.alert(
                'Erreur',
                err.response?.data?.message || err.message || 'Erreur'
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={colors.cyanBright} />
        <Text style={styles.loadingText}>Chargement de l’événement...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <Text style={styles.errorText}>{error || 'Événement introuvable'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <ScreenBackground />

      {event.photos && event.photos.length > 0 ? (
        <Image
          source={{ uri: getFullPhotoUrl(event.photos[0]) }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Aucune photo</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Événement</Text>
        <Text style={styles.title}>{event.title}</Text>

        <Text
          style={[
            styles.priceBadge,
            parseFloat(event.price || 0) === 0 ? styles.priceFree : null,
          ]}
        >
          {formatPrice(event.price)}
        </Text>

        <InfoRow label="Lieu" value={event.location || 'Non précisé'} />
        <InfoRow label="Date" value={formatDate(event.date)} />
        <InfoRow label="Créé le" value={formatDate(event.created_at)} />

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {event.description || 'Aucune description'}
        </Text>

        {(isAdmin || (userData && event && Number(userData.id) === Number(event.organizer_id))) && (
          <View style={styles.manageRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EventForm', { event })}
            >
              <Text style={styles.editBtnText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPast ? (
          <View style={styles.disabledAction}>
            <Text style={styles.disabledActionText}>Événement terminé</Text>
          </View>
        ) : isRegistered ? (
          <View style={styles.registeredContainer}>
            <Text style={styles.registeredText}>Vous êtes inscrit</Text>
            <TouchableOpacity
              style={styles.unregisterButton}
              onPress={handleUnregister}
            >
              <Text style={styles.unregisterButtonText}>
                Se désinscrire
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionStack}>
            <TouchableOpacity
              style={[
                styles.cartButton,
                inCart ? styles.cartButtonIn : null,
              ]}
              onPress={handleAddToCart}
            >
              <Text style={[styles.cartButtonText, inCart ? styles.cartButtonTextIn : null]}>
                {inCart ? 'Déjà dans le panier' : 'Ajouter au panier'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.registerButton,
                registering ? styles.registerButtonDisabled : null,
              ]}
              onPress={handleRegister}
              disabled={registering}
            >
              {registering ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.registerButtonText}>S’inscrire</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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

function getFullPhotoUrl(photoPath) {
  if (!photoPath) return null;
  if (photoPath.startsWith('http')) return photoPath;
  return `${SERVER_BASE_URL}${photoPath}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.shell,
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
  },
  errorText: {
    color: colors.ink,
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 14,
  },
  backButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...shadows.card,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontFamily: fonts.heading,
  },

  image: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  imagePlaceholderText: {
    color: colors.muted,
    fontWeight: '700',
  },

  content: {
    backgroundColor: colors.panelStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadows.panel,
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
  },
  priceBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 14,
    color: colors.cyan,
    backgroundColor: colors.skySoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  priceFree: {
    color: colors.success,
    backgroundColor: colors.successSoft,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  infoLabel: {
    color: colors.muted,
    fontWeight: '600',
    marginRight: 12,
    flexShrink: 0,
  },
  infoValue: {
    color: colors.ink,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },

  sectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  description: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 23,
  },

  registerButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    ...shadows.card,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
    fontSize: 15,
  },

  actionStack: {
    marginTop: 18,
    gap: 10,
  },

  cartButton: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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

  registeredContainer: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 12,
  },
  registeredText: {
    color: colors.success,
    fontWeight: '800',
    marginBottom: 10,
  },
  unregisterButton: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  unregisterButtonText: {
    color: colors.danger,
    fontWeight: '800',
  },

  disabledAction: {
    marginTop: 18,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledActionText: {
    color: colors.muted,
    fontWeight: '700',
  },

  manageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 4,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cyanBright,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.skySoft,
  },
  editBtnText: {
    color: colors.cyan,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: colors.dangerSoft,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
});