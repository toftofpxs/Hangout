import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import API, { SERVER_BASE_URL } from '../api/axios';
import ScreenBackground from '../components/ScreenBackground';
import { colors, fonts, shadows } from '../theme';

/* ---------- helpers ---------- */

function formatDateDisplay(d) {
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimeDisplay(d) {
  if (!d || isNaN(d)) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function mergeDatePart(current, selected) {
  const r = new Date(current);
  r.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return r;
}

function mergeTimePart(current, selected) {
  const r = new Date(current);
  r.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return r;
}

/* ---------- DatePicker modal (iOS bottom sheet / Android dialog) ---------- */

function DatePickerModal({ visible, value, mode, onConfirm, onCancel }) {
  const [temp, setTemp] = useState(value ?? new Date());

  useEffect(() => {
    if (visible) setTemp(value ?? new Date());
  }, [visible, value]);

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={temp}
        mode={mode}
        display="default"
        onChange={(e, selected) => {
          if (e.type === 'dismissed') { onCancel(); return; }
          if (selected) onConfirm(selected);
        }}
      />
    );
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={pickerStyles.sheet} activeOpacity={1}>
          <View style={pickerStyles.sheetHeader}>
            <Text style={pickerStyles.sheetTitle}>
              {mode === 'date' ? 'Choisir la date' : "Choisir l'heure"}
            </Text>
          </View>
          <DateTimePicker
            value={temp}
            mode={mode}
            display="spinner"
            onChange={(_, selected) => { if (selected) setTemp(selected); }}
            textColor={colors.ink}
            locale="fr-FR"
            style={{ width: '100%' }}
          />
          <View style={pickerStyles.sheetActions}>
            <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onCancel}>
              <Text style={pickerStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pickerStyles.confirmBtn} onPress={() => onConfirm(temp)}>
              <Text style={pickerStyles.confirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ---------- Main screen ---------- */

export default function EventFormScreen({ route, navigation }) {
  const existingEvent = route.params?.event ?? null;
  const isEdit = Boolean(existingEvent);

  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [description, setDescription] = useState(existingEvent?.description ?? '');
  const [location, setLocation] = useState(existingEvent?.location ?? '');
  const [price, setPrice] = useState(
    existingEvent?.price ? String(parseFloat(existingEvent.price)) : ''
  );

  const buildInitDate = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  };

  const initStart = existingEvent?.date
    ? new Date(existingEvent.date)
    : buildInitDate();
  const initEnd = existingEvent?.end_date
    ? new Date(existingEvent.end_date)
    : (() => { const d = new Date(initStart); d.setHours(d.getHours() + 2); return d; })();

  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);

  const [picker, setPicker] = useState({ visible: false, field: 'start', mode: 'date' });

  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState(existingEvent?.photos ?? []);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Modifier l'événement" : 'Nouvel événement',
    });
  }, [navigation, isEdit]);

  const openPicker = (field, mode) => {
    Keyboard.dismiss();
    setPicker({ visible: true, field, mode });
  };

  const handlePickerConfirm = useCallback(
    (selected) => {
      setPicker((p) => ({ ...p, visible: false }));
      if (picker.field === 'start') {
        setStartDate((prev) =>
          picker.mode === 'date' ? mergeDatePart(prev, selected) : mergeTimePart(prev, selected)
        );
      } else {
        setEndDate((prev) =>
          picker.mode === 'date' ? mergeDatePart(prev, selected) : mergeTimePart(prev, selected)
        );
      }
    },
    [picker.field, picker.mode]
  );

  const handlePickerCancel = () => setPicker((p) => ({ ...p, visible: false }));

  const pickImages = async () => {
    const remaining = 5 - existingPhotos.length - newPhotos.length;
    if (remaining <= 0) {
      Alert.alert('Limite atteinte', 'Maximum 5 photos par événement.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la galerie est nécessaire.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      const added = result.assets.slice(0, remaining).map((asset) => {
        const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
        const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        return {
          uri: asset.uri,
          name: `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
          type: mime,
        };
      });
      setNewPhotos((prev) => [...prev, ...added]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Champ requis', 'Le titre est requis.'); return; }
    if (!location.trim()) { Alert.alert('Champ requis', 'Le lieu est requis.'); return; }
    if (!description.trim()) { Alert.alert('Champ requis', 'La description est requise.'); return; }
    if (endDate <= startDate) {
      Alert.alert('Date incorrecte', 'La date de fin doit être après la date de début.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('location', location.trim());
      formData.append('price', price || '0');
      formData.append('date', startDate.toISOString());
      formData.append('end_date', endDate.toISOString());

      if (existingPhotos.length > 0) {
        formData.append('photos', JSON.stringify(existingPhotos));
      }

      newPhotos.forEach((photo) => {
        formData.append('photos', { uri: photo.uri, name: photo.name, type: photo.type });
      });

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEdit) {
        await API.put(`/events/${existingEvent.id}`, formData, config);
        Alert.alert('Succès', 'Événement modifié avec succès.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await API.post('/events', formData, config);
        Alert.alert('Succès', 'Événement créé avec succès.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Une erreur est survenue.';
      Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  const fullUrl = (path) => {
    if (!path || path.startsWith('http')) return path;
    return `${SERVER_BASE_URL}${path}`;
  };

  const photoCount = existingPhotos.length + newPhotos.length;
  const pickerValue = picker.field === 'start' ? startDate : endDate;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Titre *">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l'événement"
              placeholderTextColor={colors.muted}
            />
          </Field>

          <Field label="Lieu *">
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Adresse ou ville"
              placeholderTextColor={colors.muted}
            />
          </Field>

          <Field label="Date de début *">
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={() => openPicker('start', 'date')}
              >
                <Text style={styles.dateChipLabel}>Jour</Text>
                <Text style={styles.dateChipValue}>{formatDateDisplay(startDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={() => openPicker('start', 'time')}
              >
                <Text style={styles.dateChipLabel}>Heure</Text>
                <Text style={styles.dateChipValue}>{formatTimeDisplay(startDate)}</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="Date de fin *">
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={() => openPicker('end', 'date')}
              >
                <Text style={styles.dateChipLabel}>Jour</Text>
                <Text style={styles.dateChipValue}>{formatDateDisplay(endDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={() => openPicker('end', 'time')}
              >
                <Text style={styles.dateChipLabel}>Heure</Text>
                <Text style={styles.dateChipValue}>{formatTimeDisplay(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="Prix (EUR)">
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00 — laisser vide si gratuit"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </Field>

          <Field label="Description *">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez votre événement..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </Field>

          <Field label={`Photos (${photoCount}/5)`}>
            {existingPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {existingPhotos.map((url, i) => (
                  <View key={`ex-${i}`} style={styles.photoItem}>
                    <Image
                      source={{ uri: fullUrl(url) }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() =>
                        setExistingPhotos((p) => p.filter((_, idx) => idx !== i))
                      }
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {newPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {newPhotos.map((photo, i) => (
                  <View key={`new-${i}`} style={styles.photoItem}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() =>
                        setNewPhotos((p) => p.filter((_, idx) => idx !== i))
                      }
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {photoCount < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                <Text style={styles.addPhotoBtnText}>＋ Ajouter des photos</Text>
              </TouchableOpacity>
            )}
          </Field>

          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>
                {isEdit ? "Enregistrer les modifications" : "Créer l'événement"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={picker.visible}
        value={pickerValue}
        mode={picker.mode}
        onConfirm={handlePickerConfirm}
        onCancel={handlePickerCancel}
      />
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.shell },
  content: { padding: 16, paddingBottom: 40, gap: 4 },

  field: { marginBottom: 14 },
  fieldLabel: {
    color: colors.inkSoft,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: fonts.heading,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.body,
    ...shadows.card,
  },
  textArea: { minHeight: 110, paddingTop: 12 },

  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: {
    flex: 1,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    ...shadows.card,
  },
  dateChipLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  dateChipValue: { color: colors.ink, fontWeight: '700', fontSize: 13 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoItem: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  addPhotoBtn: {
    borderWidth: 1.5,
    borderColor: colors.cyanBright,
    borderRadius: 14,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.skySoft,
  },
  addPhotoBtnText: { color: colors.cyanBright, fontWeight: '700', fontSize: 14 },

  submitBtn: {
    backgroundColor: colors.cyanBright,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    ...shadows.panel,
  },
  submitText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    fontFamily: fonts.heading,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.shell,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    ...shadows.panel,
  },
  sheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
    fontFamily: fonts.heading,
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.panel,
  },
  cancelText: { color: colors.ink, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  confirmText: { color: colors.white, fontWeight: '800' },
});
