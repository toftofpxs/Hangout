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
import { getAdminUserStats } from '../services/adminUsersService';
import { colors, fonts, shadows } from '../theme';

const USER_RULE_TEXT = 'Règle : seul le super_user peut bannir un admin/super_user.';
const USER_ROLE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'participant', label: 'Participants' },
  { value: 'organisateur', label: 'Organisateurs' },
  { value: 'admin', label: 'Admins' },
  { value: 'super_user', label: 'Super utilisateurs' },
];
const ROLE_SEARCH_TERMS = {
  participant: ['participant', 'participants'],
  organisateur: ['organisateur', 'organisateurs'],
  admin: ['admin', 'admins', 'administrateur', 'administrateurs'],
  super_user: ['super_user', 'super user', 'super users', 'super utilisateur', 'super utilisateurs'],
};

function roleLabel(role) {
  switch (role) {
    case 'super_user':
      return 'Super utilisateur';
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

export default function AdminUsersScreen() {
  const { userData, updateUserData, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', role: 'participant' });
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState(null);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_user';
  const canAssignSuperUser = userData?.role === 'super_user';

  const availableRoles = useMemo(
    () => (canAssignSuperUser
      ? ['participant', 'organisateur', 'admin', 'super_user']
      : ['participant', 'organisateur', 'admin']),
    [canAssignSuperUser]
  );

  const filteredUsers = useMemo(() => {
    const needle = normalizeSearchText(userSearch);

    return users.filter((entry) => {
      const searchTerms = [
        entry.name,
        entry.email,
        entry.role,
        roleLabel(entry.role),
        ...(ROLE_SEARCH_TERMS[entry.role] || []),
      ];

      const matchesSearch = !needle || searchTerms.some((value) => (
        normalizeSearchText(value).includes(needle)
      ));

      const matchesRole = userRoleFilter === 'all' || entry.role === userRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [userRoleFilter, userSearch, users]);

  const userSuggestions = useMemo(() => (
    getSearchSuggestions(
      users.flatMap((entry) => [
        { value: entry.email, kind: 'Email' },
        { value: entry.name, kind: 'Nom' },
        { value: roleLabel(entry.role), kind: 'Rôle' },
        ...(ROLE_SEARCH_TERMS[entry.role] || []).map((term) => ({ value: term, kind: 'Rôle' })),
      ]),
      userSearch
    )
  ), [userSearch, users]);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const response = await API.get('/admin/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
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
      await loadUsers();
      setLoading(false);
    };

    init();
  }, [loadUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const startEditUser = (target) => {
    setEditingUserId(target.id);
    setUserForm({
      name: target.name || '',
      role: target.role || 'participant',
    });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setUserForm({ name: '', role: 'participant' });
  };

  const saveUser = async (targetId) => {
    try {
      setSavingUserId(targetId);
      const payload = {
        name: userForm.name.trim(),
        role: userForm.role,
      };
      const response = await API.put(`/admin/users/${targetId}`, payload);
      const updatedUser = response.data;

      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === targetId ? updatedUser : user
      )));
      cancelEditUser();

      if (Number(selectedUserId) === Number(targetId)) {
        await loadUserDetails(targetId);
      }

      if (Number(userData?.id) === Number(targetId)) {
        await updateUserData(updatedUser);
      }

      Alert.alert('Succès', 'Utilisateur mis à jour.');
    } catch (err) {
      Alert.alert(
        'Erreur',
        err.response?.data?.message || 'Erreur lors de la mise à jour utilisateur.'
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const banUser = (target) => {
    Alert.alert(
      'Bannir un utilisateur',
      `Bannir ou supprimer ${target.name || target.email || 'cet utilisateur'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bannir',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingUserId(target.id);
              await API.delete(`/admin/users/${target.id}`);
              setUsers((currentUsers) => currentUsers.filter((user) => user.id !== target.id));

              if (Number(selectedUserId) === Number(target.id)) {
                closeUserDetails();
              }

              if (Number(userData?.id) === Number(target.id)) {
                await logout();
                return;
              }

              Alert.alert('Succès', 'Utilisateur banni ou supprimé.');
            } catch (err) {
              Alert.alert(
                'Erreur',
                err.response?.data?.message || 'Impossible de bannir cet utilisateur.'
              );
            } finally {
              setDeletingUserId(null);
            }
          },
        },
      ]
    );
  };

  const closeUserDetails = () => {
    setSelectedUserId(null);
    setSelectedUserDetails(null);
    setUserDetailsError(null);
    setUserDetailsLoading(false);
  };

  const loadUserDetails = async (targetId) => {
    if (!targetId) return;

    setSelectedUserId(targetId);
    setSelectedUserDetails(null);
    setUserDetailsError(null);
    setUserDetailsLoading(true);

    try {
      const payload = await getAdminUserStats(targetId);
      setSelectedUserDetails(payload || null);
    } catch (err) {
      const message = err.response?.data?.message || 'Impossible de charger la fiche utilisateur.';
      setUserDetailsError(message);
      Alert.alert('Erreur', message);
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const toggleUserDetails = async (targetId) => {
    if (!targetId) return;

    if (Number(selectedUserId) === Number(targetId)) {
      closeUserDetails();
      return;
    }

    await loadUserDetails(targetId);
  };

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
        <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
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
          <Text style={styles.heroTitle}>Utilisateurs</Text>
          <Text style={styles.heroCopy}>
            Modifiez les profils et les rôles, puis retirez les comptes non autorisés.
          </Text>
          <Text style={styles.helperText}>
            {USER_RULE_TEXT}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={loadUsers}>
              <Text style={styles.primaryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Affichés</Text>
            <Text style={styles.statValue}>{filteredUsers.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Admins</Text>
            <Text style={styles.statValue}>
              {filteredUsers.filter((entry) => entry.role === 'admin' || entry.role === 'super_user').length}
            </Text>
          </View>
        </View>

        <View style={styles.filtersPanel}>
          <TextInput
            style={styles.input}
            value={userSearch}
            onChangeText={setUserSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
            placeholder="Rechercher par nom, email ou rôle"
            placeholderTextColor={colors.muted}
          />

          {userSearch.trim() && userSuggestions.length && isSearchFocused ? (
            <View style={styles.suggestionsPanel}>
              {userSuggestions.map((item) => (
                <TouchableOpacity
                  key={`${item.kind}-${item.value}`}
                  style={styles.suggestionButton}
                  onPress={() => {
                    setUserSearch(item.value);
                    setIsSearchFocused(false);
                  }}
                >
                  <Text style={styles.suggestionValue}>
                    {renderHighlightedSuggestion(item.value, userSearch)}
                  </Text>
                  <Text style={styles.suggestionMeta}>{item.kind}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.filtersWrap}>
            {USER_ROLE_FILTERS.map((filter) => {
              const active = userRoleFilter === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setUserRoleFilter(filter.value)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.helperText}>
            {filteredUsers.length} utilisateur(s) affiché(s) sur {users.length}
          </Text>
        </View>

        {filteredUsers.map((user) => {
          const isEditing = editingUserId === user.id;

          return (
            <View key={user.id} style={styles.card}>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={userForm.name}
                    onChangeText={(value) => setUserForm((state) => ({ ...state, name: value }))}
                    placeholder="Nom"
                    placeholderTextColor={colors.muted}
                  />

                  <View style={styles.rolesWrap}>
                    {availableRoles.map((role) => {
                      const active = userForm.role === role;

                      return (
                        <TouchableOpacity
                          key={role}
                          style={[styles.roleChip, active && styles.roleChipActive]}
                          onPress={() => setUserForm((state) => ({ ...state, role }))}
                        >
                          <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                            {roleLabel(role)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.primaryButtonInline}
                      disabled={savingUserId === user.id}
                      onPress={() => saveUser(user.id)}
                    >
                      <Text style={styles.primaryButtonText}>
                        {savingUserId === user.id ? 'Enregistrement...' : 'Valider'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={cancelEditUser}>
                      <Text style={styles.secondaryButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderMain}>
                      <Text style={styles.cardTitle}>{user.name || 'Utilisateur'}</Text>
                      <Text style={styles.cardSubtitle}>{user.email || '-'}</Text>
                    </View>
                    <Text style={styles.roleBadge}>{roleLabel(user.role)}</Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => toggleUserDetails(user.id)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {userDetailsLoading && Number(selectedUserId) === Number(user.id)
                          ? 'Chargement...'
                          : Number(selectedUserId) === Number(user.id)
                            ? 'Fermer fiche'
                            : 'Voir fiche'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButtonInline}
                      onPress={() => startEditUser(user)}
                    >
                      <Text style={styles.primaryButtonText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dangerButton}
                      disabled={deletingUserId === user.id}
                      onPress={() => banUser(user)}
                    >
                      <Text style={styles.dangerButtonText}>
                        {deletingUserId === user.id ? 'Suppression...' : 'Bannir'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {Number(selectedUserId) === Number(user.id) ? (
                    <View style={styles.detailsPanel}>
                      <View style={styles.detailsHeader}>
                        <Text style={styles.detailsTitle}>Fiche utilisateur</Text>
                        <TouchableOpacity style={styles.detailCloseButton} onPress={closeUserDetails}>
                          <Text style={styles.detailCloseButtonText}>Fermer</Text>
                        </TouchableOpacity>
                      </View>

                      {userDetailsLoading ? (
                        <Text style={styles.helperText}>Chargement des statistiques...</Text>
                      ) : userDetailsError ? (
                        <Text style={styles.errorInlineText}>{userDetailsError}</Text>
                      ) : selectedUserDetails?.user ? (
                        <>
                          <View style={styles.identityPanel}>
                            <Text style={styles.identityText}>Nom : {selectedUserDetails.user.name || '-'}</Text>
                            <Text style={styles.identityText}>Email : {selectedUserDetails.user.email || '-'}</Text>
                            <Text style={styles.identityText}>Rôle : {roleLabel(selectedUserDetails.user.role)}</Text>
                            <Text style={styles.identityText}>
                              Date de création : {formatDateTimeSafe(selectedUserDetails.user.created_at) || 'Date inconnue'}
                            </Text>
                          </View>

                          <View style={styles.metricsGrid}>
                            <StatItem label="Événements créés" value={selectedUserDetails.stats?.eventsCreated} />
                            <StatItem label="Événements à venir" value={selectedUserDetails.stats?.upcomingEvents} />
                            <StatItem
                              label="Dernier événement organisé"
                              value={formatDateTimeSafe(selectedUserDetails.stats?.lastOrganizedEventDate) || 'Pas d\'événement créé'}
                            />
                            <StatItem
                              label="Participants sur ses événements"
                              value={selectedUserDetails.stats?.participantsOnOrganizedEvents}
                            />
                            <StatItem
                              label="Transactions payées"
                              value={selectedUserDetails.stats?.paidTransactionsOnOrganizedEvents}
                            />
                            <StatItem
                              label="Revenu généré"
                              value={formatCurrency(selectedUserDetails.stats?.revenueOnOrganizedEvents)}
                            />
                            <StatItem label="Inscriptions" value={selectedUserDetails.stats?.registrations} />
                            <StatItem label="Inscriptions confirmées" value={selectedUserDetails.stats?.confirmedRegistrations} />
                            <StatItem label="Inscriptions en attente" value={selectedUserDetails.stats?.pendingRegistrations} />
                            <StatItem label="Paiements" value={selectedUserDetails.stats?.payments} />
                            <StatItem label="Paiements payés" value={selectedUserDetails.stats?.paidPayments} />
                            <StatItem
                              label="Montant total payé"
                              value={formatCurrency(selectedUserDetails.stats?.totalAmountPaid)}
                            />
                          </View>

                          <View style={styles.recentPanel}>
                            <Text style={styles.recentTitle}>Derniers événements organisés</Text>
                            {Array.isArray(selectedUserDetails.recentOrganizedEvents)
                              && selectedUserDetails.recentOrganizedEvents.length ? (
                                selectedUserDetails.recentOrganizedEvents.map((event) => (
                                  <Text key={event.id} style={styles.recentItem}>
                                    {event.title || 'Événement'} - {formatDateRangeSafe(event.date, event.end_date)} - {Number(event.participantsCount || 0)} participant(s)
                                  </Text>
                                ))
                              ) : (
                                <Text style={styles.helperText}>Aucun événement organisé.</Text>
                              )}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.helperText}>Aucune donnée disponible.</Text>
                      )}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          );
        })}

        {!filteredUsers.length ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyText}>Aucun utilisateur ne correspond aux filtres.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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

function StatItem({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? 0}</Text>
    </View>
  );
}

function formatDateTimeSafe(value) {
  if (value == null || value === '') return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('fr-FR');
}

function formatDateRangeSafe(startValue, endValue) {
  const start = formatDateTimeSafe(startValue);
  const end = formatDateTimeSafe(endValue || startValue);

  if (!start) return 'Date inconnue';
  if (!end || start === end) return start;
  return `${start} -> ${end}`;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
  },
  heroCopy: {
    marginTop: 10,
    color: colors.inkSoft,
    lineHeight: 21,
  },
  helperText: {
    marginTop: 10,
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
  roleBadge: {
    color: colors.cyan,
    backgroundColor: colors.skySoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
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
  rolesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipActive: {
    backgroundColor: colors.cyanBright,
    borderColor: colors.cyanBright,
  },
  roleChipText: {
    color: colors.ink,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: colors.white,
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
  detailsPanel: {
    marginTop: 6,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailsTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
    fontFamily: fonts.heading,
  },
  detailCloseButton: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailCloseButtonText: {
    color: colors.ink,
    fontWeight: '700',
  },
  errorInlineText: {
    color: colors.danger,
    fontSize: 13,
  },
  identityPanel: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  identityText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    minWidth: '48%',
    flexGrow: 1,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  recentPanel: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  recentTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontFamily: fonts.heading,
  },
  recentItem: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
  },
});