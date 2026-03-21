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
import ScreenBackground from '../components/ScreenBackground';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, shadows } from '../theme';
import { formatDate, formatPrice } from '../utils/formatDate';

const EVENT_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'free', label: 'Gratuits' },
  { value: 'paid', label: 'Payants' },
  { value: 'busy', label: 'Avec participants' },
];

export default function AdminEventsScreen({ navigation }) {
  const { userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_user';

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const response = await API.get('/admin/events-summary');
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || `Erreur serveur (${err.response.status})`);
      } else if (err.request) {
        setError('Impossible de joindre le serveur');
      } else {
        setError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadEvents();
      setLoading(false);
    };

    init();
  }, [loadEvents]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!loading) {
        loadEvents();
      }
    });

    return unsubscribe;
  }, [navigation, loading, loadEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleDelete = (event) => {
    Alert.alert(
      "Supprimer l'événement",
      `Supprimer ${event.title || 'cet événement'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(event.id);
              await API.delete(`/events/${event.id}`);
              setEvents((currentEvents) => currentEvents.filter((entry) => entry.id !== event.id));
              Alert.alert('Succès', 'Événement supprimé.');
            } catch (err) {
              Alert.alert(
                'Erreur',
                err.response?.data?.message || 'Suppression impossible.'
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter((event) => new Date(event.end_date || event.date) >= now).length;
    const participants = events.reduce(
      (sum, event) => sum + Number(event.participantsCount || 0),
      0
    );

    return [
      { label: 'Catalogue', value: events.length },
      { label: 'À venir', value: upcoming },
      { label: 'Participants', value: participants },
    ];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const needle = normalizeSearchText(eventSearch);
    const now = new Date();

    return events.filter((event) => {
      const matchesSearch = !needle || [
        event.title,
        event.location,
        event.organizer_name,
        event.organizer_email,
      ].some((value) => normalizeSearchText(value).includes(needle));

      const endDate = new Date(event.end_date || event.date);
      const isUpcoming = !Number.isNaN(endDate.getTime()) && endDate >= now;
      const isFree = Number(event.price || 0) === 0;
      const hasParticipants = Number(event.participantsCount || 0) > 0;

      const matchesFilter =
        eventFilter === 'all' ||
        (eventFilter === 'upcoming' && isUpcoming) ||
        (eventFilter === 'free' && isFree) ||
        (eventFilter === 'paid' && !isFree) ||
        (eventFilter === 'busy' && hasParticipants);

      return matchesSearch && matchesFilter;
    });
  }, [eventFilter, eventSearch, events]);

  const eventSuggestions = useMemo(() => (
    getSearchSuggestions(
      events.flatMap((event) => [
        { value: event.title, kind: 'Titre' },
        { value: event.location, kind: 'Lieu' },
        { value: event.organizer_name, kind: 'Organisateur' },
        { value: event.organizer_email, kind: 'Email' },
      ]),
      eventSearch
    )
  ), [eventSearch, events]);

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <Text style={styles.errorTitle}>Accès refusé</Text>
        <Text style={styles.errorText}>Cette section est réservée aux administrateurs.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={colors.cyanBright} />
        <Text style={styles.loadingText}>Chargement des événements...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setIsSearchFocused(false)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cyanBright}
          />
        }
      >
        <View style={styles.heroPanel}>
          <Text style={styles.heroEyebrow}>Administration</Text>
          <Text style={styles.heroTitle}>Événements</Text>
          <Text style={styles.heroCopy}>
            Parcourez tout le catalogue et intervenez rapidement sur un événement.
          </Text>
          <Text style={styles.helperText}>
            Vue admin : organisateur et nombre de participants affichés sur chaque fiche.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('EventForm')}
          >
            <Text style={styles.primaryButtonText}>Créer un événement</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={loadEvents}>
              <Text style={styles.primaryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filtersPanel}>
          <TextInput
            style={styles.searchInput}
            value={eventSearch}
            onChangeText={setEventSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
            placeholder="Rechercher par titre, lieu ou organisateur"
            placeholderTextColor={colors.muted}
          />

          {eventSearch.trim() && eventSuggestions.length && isSearchFocused ? (
            <View style={styles.suggestionsPanel}>
              {eventSuggestions.map((item) => (
                <TouchableOpacity
                  key={`${item.kind}-${item.value}`}
                  style={styles.suggestionButton}
                  onPress={() => {
                    setEventSearch(item.value);
                    setIsSearchFocused(false);
                  }}
                >
                  <Text style={styles.suggestionValue}>
                    {renderHighlightedSuggestion(item.value, eventSearch)}
                  </Text>
                  <Text style={styles.suggestionMeta}>{item.kind}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.filtersWrap}>
            {EVENT_FILTERS.map((filter) => {
              const active = eventFilter === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setEventFilter(filter.value)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.helperText}>
            {filteredEvents.length} événement(s) affiché(s) sur {events.length}
          </Text>
        </View>

        {filteredEvents.length ? filteredEvents.map((event) => (
          <View key={event.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderMain}>
                <Text style={styles.cardTitle}>{event.title || 'Événement'}</Text>
                <Text style={styles.cardSubtitle}>
                  {event.location || 'Lieu à confirmer'}
                </Text>
              </View>
              <Text style={styles.priceBadge}>{formatPrice(event.price)}</Text>
            </View>

            <View style={styles.metaList}>
              <Text style={styles.metaItem}>Dates : {formatDateRange(event.date, event.end_date)}</Text>
              <Text style={styles.metaItem}>Organisateur : {organizerLabel(event)}</Text>
              <Text style={styles.metaItem}>
                Participants : {Number(event.participantsCount || 0)}
              </Text>
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {event.description || 'Aucune description'}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
              >
                <Text style={styles.secondaryButtonText}>Voir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButtonInline}
                onPress={() => navigation.navigate('EventForm', { event })}
              >
                <Text style={styles.primaryButtonText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerButton}
                disabled={deletingId === event.id}
                onPress={() => handleDelete(event)}
              >
                <Text style={styles.dangerButtonText}>
                  {deletingId === event.id ? 'Suppression...' : 'Supprimer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyText}>Aucun événement ne correspond aux filtres.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateRange(startValue, endValue) {
  const start = formatDate(startValue);
  const end = formatDate(endValue || startValue);

  if (!start) return 'Date non définie';
  if (!end || start === end) return start;
  return `${start} -> ${end}`;
}

function organizerLabel(event) {
  return event.organizer_name || event.organizer_email || 'Compte supprimé';
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchSuggestions(items, searchValue) {
  const needle = normalizeSearchText(searchValue);
  if (!needle) return [];

  const uniqueItems = new Map();

  items.forEach((item) => {
    const rawValue = String(item?.value || '').trim();
    const normalized = normalizeSearchText(rawValue);

    if (!rawValue || !normalized || uniqueItems.has(normalized) || !normalized.includes(needle)) {
      return;
    }

    uniqueItems.set(normalized, { ...item, value: rawValue, normalized });
  });

  return Array.from(uniqueItems.values())
    .sort((left, right) => {
      const scoreDiff = suggestionScore(left.normalized, needle) - suggestionScore(right.normalized, needle);
      if (scoreDiff !== 0) return scoreDiff;
      return left.value.localeCompare(right.value, 'fr', { sensitivity: 'base' });
    })
    .slice(0, 6);
}

function suggestionScore(value, needle) {
  if (value === needle) return 0;
  if (value.startsWith(needle)) return 1;
  if (value.includes(` ${needle}`)) return 2;
  return 3;
}

function renderHighlightedSuggestion(value, searchValue) {
  return splitHighlightedText(value, searchValue).map((segment, index) => (
    <Text
      key={`${segment.text}-${index}`}
      style={segment.match ? styles.highlightText : null}
    >
      {segment.text}
    </Text>
  ));
}

function splitHighlightedText(value, searchValue) {
  const rawValue = String(value || '');
  const range = getHighlightedRange(rawValue, searchValue);

  if (!range) {
    return [{ text: rawValue, match: false }];
  }

  const segments = [];
  if (range.start > 0) {
    segments.push({ text: rawValue.slice(0, range.start), match: false });
  }

  segments.push({ text: rawValue.slice(range.start, range.end), match: true });

  if (range.end < rawValue.length) {
    segments.push({ text: rawValue.slice(range.end), match: false });
  }

  return segments.filter((segment) => segment.text);
}

function getHighlightedRange(value, searchValue) {
  const needle = normalizeSearchText(searchValue);
  if (!needle) return null;

  const characters = Array.from(String(value || ''));
  let normalizedValue = '';
  const indexMap = [];

  characters.forEach((character, index) => {
    const normalizedCharacter = normalizeSearchTextForHighlight(character);

    Array.from(normalizedCharacter).forEach((mappedCharacter) => {
      normalizedValue += mappedCharacter;
      indexMap.push(index);
    });
  });

  const matchIndex = normalizedValue.indexOf(needle);
  if (matchIndex === -1) return null;

  const start = indexMap[matchIndex];
  const end = indexMap[matchIndex + needle.length - 1] + 1;
  return { start, end };
}

function normalizeSearchTextForHighlight(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ');
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.shell },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
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
  heroPanel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 20,
    gap: 14,
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
  },
  heroCopy: {
    color: colors.inkSoft,
    lineHeight: 21,
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  errorPanel: {
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    borderRadius: 18,
    backgroundColor: colors.panelStrong,
    padding: 14,
    gap: 12,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
    fontFamily: fonts.heading,
  },
  errorText: {
    color: colors.muted,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    ...shadows.card,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    marginTop: 8,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  filtersPanel: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    ...shadows.card,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },
  suggestionsPanel: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  suggestionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  suggestionValue: {
    color: colors.ink,
    flex: 1,
  },
  highlightText: {
    color: colors.cyanBright,
    fontWeight: '800',
  },
  suggestionMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.cyanBright,
    borderColor: colors.cyanBright,
  },
  filterChipText: {
    color: colors.ink,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardHeaderMain: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  cardSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
  },
  description: {
    color: colors.inkSoft,
    lineHeight: 21,
  },
  metaList: {
    gap: 4,
  },
  metaItem: {
    color: colors.muted,
    fontSize: 13,
  },
  priceBadge: {
    color: colors.cyan,
    backgroundColor: colors.skySoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  primaryButtonInline: {
    flex: 1,
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: '700',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  emptyPanel: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 18,
    ...shadows.card,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
  },
});