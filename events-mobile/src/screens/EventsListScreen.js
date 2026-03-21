import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API from '../api/axios';
import EventCard from '../components/EventCard';
import ScreenBackground from '../components/ScreenBackground';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatDate } from '../utils/formatDate';
import { showToast } from '../utils/toast';
import { colors, fonts, shadows } from '../theme';

const BASE_TABS = [
  { key: 'events', label: 'Événements' },
  { key: 'account', label: 'Mon compte' },
];

export default function EventsListScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [inscriptions, setInscriptions] = useState({ enCours: [], passes: [] });
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('events');

  const { userData, updateUserData, logout } = useAuth();
  const { addToCart, isInCart, itemCount } = useCart();
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_user';

  const tabs = useMemo(() => {
    if (!isAdmin) return BASE_TABS;
    return [...BASE_TABS, { key: 'admin', label: 'Admin' }];
  }, [isAdmin]);

  const fetchEvents = useCallback(async () => {
    const response = await API.get('/events');
    setEvents(Array.isArray(response.data) ? response.data : []);
  }, []);

  const fetchContextPanels = useCallback(async () => {
    if (!userData) {
      setInscriptions({ enCours: [], passes: [] });
      setAdminUsers([]);
      setAdminEvents([]);
      return;
    }

    const tasks = [API.get('/inscriptions/me')];

    if (isAdmin) {
      tasks.push(API.get('/admin/users'));
      tasks.push(API.get('/admin/events-summary'));
    }

    const results = await Promise.allSettled(tasks);
    const inscriptionsResult = results[0];

    if (inscriptionsResult?.status === 'fulfilled') {
      setInscriptions(inscriptionsResult.value.data || { enCours: [], passes: [] });
    } else {
      setInscriptions({ enCours: [], passes: [] });
    }

    if (isAdmin) {
      const usersResult = results[1];
      const eventsResult = results[2];

      setAdminUsers(usersResult?.status === 'fulfilled' ? usersResult.value.data || [] : []);
      setAdminEvents(eventsResult?.status === 'fulfilled' ? eventsResult.value.data || [] : []);
    }
  }, [isAdmin, userData]);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([fetchEvents(), fetchContextPanels()]);
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || `Erreur serveur (${err.response.status})`);
      } else if (err.request) {
        setError('Impossible de joindre le serveur');
      } else {
        setError(err.message);
      }
    }
  }, [fetchContextPanels, fetchEvents]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    };

    load();
  }, [loadAll]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!loading) loadAll();
    });
    return unsubscribe;
  }, [navigation, loadAll, loading]);

  useEffect(() => {
    setProfileName(userData?.name || '');
  }, [userData?.name]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleUpdateProfile = async () => {
    const trimmedName = profileName.trim();

    if (!trimmedName) {
      Alert.alert('Champ requis', 'Le pseudo ne peut pas être vide.');
      return;
    }

    if (trimmedName === (userData?.name || '').trim()) {
      Alert.alert('Information', 'Aucune modification à enregistrer.');
      return;
    }

    try {
      setSavingProfile(true);
      const response = await API.put('/users/me', { name: trimmedName });
      await updateUserData(response.data);
      await loadAll();
      Alert.alert('Succès', 'Pseudo mis à jour.');
    } catch (err) {
      Alert.alert(
        'Erreur',
        err.response?.data?.message || 'Impossible de mettre à jour votre pseudo.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const stats = useMemo(() => {
    const freeEvents = events.filter((event) => Number(event.price || 0) === 0).length;
    const upcoming = events.filter((event) => new Date(event.end_date || event.date) >= new Date()).length;

    return [
      { label: 'Disponibles', value: events.length, tone: 'cyan' },
      { label: 'À venir', value: upcoming, tone: 'teal' },
      { label: 'Gratuits', value: freeEvents, tone: 'gold' },
    ];
  }, [events]);

  const accountStats = useMemo(() => {
    const upcoming = inscriptions.enCours?.length || 0;
    const past = inscriptions.passes?.length || 0;

    return [
      { label: 'Actives', value: upcoming, tone: 'cyan' },
      { label: 'Passées', value: past, tone: 'gold' },
      { label: 'Role', value: roleLabel(userData?.role), tone: 'teal' },
    ];
  }, [inscriptions.enCours, inscriptions.passes, userData?.role]);

  const adminStats = useMemo(() => {
    const totalParticipants = adminEvents.reduce(
      (sum, event) => sum + Number(event.participantsCount || 0),
      0
    );

    return [
      { label: 'Utilisateurs', value: adminUsers.length, tone: 'gold' },
      { label: 'Événements', value: adminEvents.length, tone: 'cyan' },
      { label: 'Participants', value: totalParticipants, tone: 'teal' },
    ];
  }, [adminEvents, adminUsers.length]);

  const registeredEventIds = useMemo(() => {
    const ids = new Set();
    const allInscriptions = [
      ...(inscriptions.enCours || []),
      ...(inscriptions.passes || []),
    ];

    allInscriptions.forEach((entry) => {
      const event = extractEvent(entry);
      if (event?.id) {
        ids.add(Number(event.id));
      }
    });

    return ids;
  }, [inscriptions.enCours, inscriptions.passes]);

  const handleAddToCart = (event) => {
    const added = addToCart(event);
    if (added) {
      showToast('Événement ajouté au panier.');
      return;
    }
    showToast('Cet événement est déjà dans votre panier.');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={colors.cyanBright} />
        <Text style={styles.loadingText}>Préparation de votre espace Hangout...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <Text style={styles.errorTitle}>Chargement impossible</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadAll}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.cyanBright} />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>Hangout</Text>
            <Text style={styles.brandSubtitle}>Tableau de bord mobile des événements.</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.cartButtonText}>Panier ({itemCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroPanel}>
          <Text style={styles.heroEyebrow}>Tableau de bord</Text>
          <Text style={styles.heroTitle}>Bonjour {userData?.name || 'invité'}.</Text>

          <Text style={styles.heroCopy}>
            Retrouvez vos événements, votre compte et votre espace admin dans une seule interface.
          </Text>

          <View style={styles.heroTags}>
            <Tag tone="cyan" text={roleLabel(userData?.role)} />
            <Tag tone="teal" text={`${events.length} événements`} />
            <Tag tone="gold" text={`${inscriptions.enCours?.length || 0} inscriptions`} />
          </View>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'events' && (
          <>
            <StatsRow items={stats} />
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('EventForm')}
            >
              <Text style={styles.createBtnText}>➕  Créer un événement</Text>
            </TouchableOpacity>
            <PanelTitle title="Événements" subtitle="Liste des événements disponibles" />
            {events.length ? (
              events.map((item) => (
                <EventCard
                  key={item.id}
                  event={item}
                  onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                  onAddToCart={() => handleAddToCart(item)}
                  inCart={isInCart(item.id)}
                  disabled={registeredEventIds.has(Number(item.id))}
                />
              ))
            ) : (
              <EmptyPanel text="Aucun événement disponible pour le moment." />
            )}
          </>
        )}

        {activeTab === 'account' && (
          <>
            <StatsRow items={accountStats} />
            <Panel title="Mon compte" subtitle="Informations de profil">
              <View style={styles.profileEditor}>
                <Text style={styles.profileEditorLabel}>Modifier mon pseudo</Text>
                <TextInput
                  style={styles.profileInput}
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder="Votre pseudo"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  editable={!savingProfile}
                />
                <TouchableOpacity
                  style={[
                    styles.profileButton,
                    savingProfile && styles.profileButtonDisabled,
                  ]}
                  onPress={handleUpdateProfile}
                  disabled={savingProfile}
                >
                  <Text style={styles.profileButtonText}>
                    {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                  </Text>
                </TouchableOpacity>
              </View>

              <InfoRow label="Nom" value={userData?.name || '-'} />
              <InfoRow label="Email" value={userData?.email || '-'} />
              <InfoRow label="Role" value={roleLabel(userData?.role)} />
            </Panel>

            <Panel title="Événements à venir" subtitle="Vos inscriptions en cours">
              {renderInscriptions(inscriptions.enCours, navigation, 'Aucun événement à venir.')}
            </Panel>

            <Panel title="Événements passés" subtitle="Historique des événements terminés">
              {renderInscriptions(inscriptions.passes, navigation, 'Aucun événement passé.')}
            </Panel>
          </>
        )}

        {activeTab === 'admin' && isAdmin && (
          <>
            <StatsRow items={adminStats} />

            <Panel title="Gestion admin" subtitle="Accès rapide aux actions de pilotage">
              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => navigation.navigate('AdminUsers')}
              >
                <View>
                  <Text style={styles.adminActionTitle}>Gérer les utilisateurs</Text>
                  <Text style={styles.adminActionCopy}>
                    Modifier le nom, le rôle ou bannir un compte.
                  </Text>
                </View>
                <Text style={styles.adminActionArrow}>+</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => navigation.navigate('AdminEvents')}
              >
                <View>
                  <Text style={styles.adminActionTitle}>Gérer les événements</Text>
                  <Text style={styles.adminActionCopy}>
                    Modifier, supprimer et contrôler le catalogue complet.
                  </Text>
                </View>
                <Text style={styles.adminActionArrow}>+</Text>
              </TouchableOpacity>
            </Panel>

            <Panel title="Utilisateurs" subtitle="Comptes recents">
              {adminUsers.length ? (
                adminUsers.slice(0, 8).map((user) => (
                  <View key={user.id || user.email} style={styles.listItem}>
                    <Text style={styles.listPrimary}>{user.name || 'Utilisateur'}</Text>
                    <Text style={styles.listSecondary}>{user.email || '-'}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucun utilisateur a afficher.</Text>
              )}
            </Panel>

            <Panel title="Événements à suivre" subtitle="Synthèse de participation">
              {adminEvents.length ? (
                adminEvents.slice(0, 8).map((event) => (
                  <View key={event.id || event.title} style={styles.listItem}>
                    <Text style={styles.listPrimary}>{event.title || 'Evenement'}</Text>
                    <Text style={styles.listSecondary}>
                      {Number(event.participantsCount || 0)} participants
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucun événement admin à afficher.</Text>
              )}
            </Panel>
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fabCart}
        onPress={() => navigation.navigate('Cart')}
        activeOpacity={0.9}
      >
        <Text style={styles.fabCartIcon}>🛒</Text>
        {itemCount > 0 && (
          <View style={styles.fabCartBadge}>
            <Text style={styles.fabCartBadgeText}>{itemCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatsRow({ items }) {
  return (
    <View style={styles.statsRow}>
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={styles.statCard}>
          <Tag tone={item.tone} text={item.label} compact />
          <Text style={styles.statValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <View style={styles.panelTitleWrap}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelSubtitle}>{subtitle}</Text>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{String(value)}</Text>
    </View>
  );
}

function Tag({ text, tone = 'cyan', compact = false }) {
  return (
    <Text
      style={[
        styles.tag,
        styles[`tag${capitalize(tone)}`],
        compact && styles.tagCompact,
      ]}
    >
      {text}
    </Text>
  );
}

function EmptyPanel({ text }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function renderInscriptions(items = [], navigation, emptyText) {
  if (!items?.length) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return items.slice(0, 10).map((entry, index) => {
    const event = extractEvent(entry);
    const eventId = event?.id;
    const title = event?.title || event?.name || 'Événement';
    const dateValue = event?.date || event?.start_date || entry?.date;
    const place = event?.location || event?.lieu || 'Lieu à confirmer';

    return (
      <TouchableOpacity
        key={eventId || `${title}-${index}`}
        style={styles.listItem}
        activeOpacity={eventId ? 0.8 : 1}
        onPress={() => {
          if (eventId) navigation.navigate('EventDetail', { eventId });
        }}
      >
        <Text style={styles.listPrimary}>{title}</Text>
        <Text style={styles.listSecondary}>{formatDate(dateValue)} - {place}</Text>
      </TouchableOpacity>
    );
  });
}

function extractEvent(inscription) {
  return inscription?.event || inscription?.evenement || inscription?.eventData || inscription;
}

function roleLabel(role) {
  switch (role) {
    case 'super_user':
      return 'Super user';
    case 'admin':
      return 'Admin';
    case 'organisateur':
      return 'Organisateur';
    case 'participant':
      return 'Participant';
    default:
      return 'Compte';
  }
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.shell },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110, gap: 14 },

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

  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 10,
    fontFamily: fonts.heading,
  },

  errorText: {
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...shadows.card,
  },

  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  topActions: {
    alignItems: 'flex-end',
    gap: 8,
  },

  brandBlock: {
    flex: 1,
  },

  brand: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },

  brandSubtitle: {
    color: colors.muted,
    marginTop: 4,
  },

  logoutButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    ...shadows.card,
  },

  cartButton: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },

  cartButtonText: {
    color: colors.ink,
    fontWeight: '700',
  },

  logoutText: {
    color: colors.white,
    fontWeight: '700',
  },

  heroPanel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 20,
    ...shadows.panel,
  },

  heroEyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  heroTitle: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
  },

  heroCopy: {
    marginTop: 10,
    color: colors.inkSoft,
    lineHeight: 21,
  },

  heroTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },

  tag: {
    color: colors.cyan,
    backgroundColor: colors.skySoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },

  tagCompact: {
    paddingVertical: 4,
    fontSize: 11,
  },

  tagCyan: {
    color: colors.cyan,
    backgroundColor: colors.skySoft,
  },

  tagTeal: {
    color: '#0f766e',
    backgroundColor: colors.tealSoft,
  },

  tagGold: {
    color: '#92400e',
    backgroundColor: colors.goldSoft,
  },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },

  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },

  tabButtonActive: {
    backgroundColor: colors.cyanBright,
    borderColor: colors.cyanBright,
  },

  tabButtonText: {
    color: colors.ink,
    fontWeight: '700',
    fontFamily: fonts.heading,
  },

  tabButtonTextActive: {
    color: colors.white,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 10,
    backgroundColor: colors.panelStrong,
  },

  statValue: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
  },

  panelTitleWrap: {
    marginTop: 4,
  },

  panel: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.panelStrong,
    ...shadows.card,
  },

  panelTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },

  panelSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },

  panelBody: {
    marginTop: 12,
    gap: 8,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  infoRowLabel: {
    color: colors.muted,
    fontWeight: '600',
  },

  infoRowValue: {
    color: colors.ink,
    fontWeight: '700',
  },

  profileEditor: {
    gap: 10,
    marginBottom: 6,
    paddingBottom: 6,
  },

  profileEditorLabel: {
    color: colors.ink,
    fontWeight: '700',
    fontFamily: fonts.heading,
  },

  profileInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },

  profileButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },

  profileButtonDisabled: {
    opacity: 0.65,
  },

  profileButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },

  listItem: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },

  listPrimary: {
    color: colors.ink,
    fontWeight: '700',
  },

  listSecondary: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
  },

  adminActionCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  adminActionTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontFamily: fonts.heading,
    fontSize: 16,
  },

  adminActionCopy: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 250,
  },

  adminActionArrow: {
    color: colors.cyan,
    fontSize: 24,
    fontWeight: '800',
  },

  emptyText: {
    color: colors.muted,
    textAlign: 'center',
  },

  createBtn: {
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    ...shadows.card,
  },
  createBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
    fontSize: 15,
  },

  fabCart: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.cyanBright,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },

  fabCartIcon: {
    fontSize: 24,
  },

  fabCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  fabCartBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
});
