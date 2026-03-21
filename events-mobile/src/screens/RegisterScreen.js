import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../api/axios';
import ScreenBackground from '../components/ScreenBackground';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, shadows } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateFields = () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Nom requis');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Erreur', 'Email requis');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Erreur', 'Mot de passe requis');
      return false;
    }

    if (password.trim().length < 3) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 3 caracteres');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateFields()) return;

    try {
      setLoading(true);
      const response = await API.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;
      await login(token, user);
    } catch (error) {
      if (error.response) {
        Alert.alert('Echec inscription', error.response.data?.message || `Erreur serveur (${error.response.status})`);
      } else if (error.request) {
        Alert.alert('Réseau', 'Impossible de joindre le serveur');
      } else {
        Alert.alert('Erreur', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenBackground />
      <View style={styles.formContainer}>
        <Text style={styles.brand}>Hangout</Text>
        <View style={styles.panel}>
          <Text style={styles.title}>Inscription</Text>
          <Text style={styles.subtitle}>Creez votre compte et accedez a une experience mobile visuellement proche du frontend web.</Text>

          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Au moins 3 caracteres"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity style={[styles.button, loading ? styles.buttonDisabled : null]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Créer mon compte</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
            <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
    letterSpacing: -0.8,
    marginBottom: 18,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 22,
    ...shadows.panel,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
    fontFamily: fonts.heading,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 30,
    lineHeight: 20,
  },
  label: {
    marginBottom: 6,
    marginLeft: 2,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  input: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: colors.ink,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.cyanBright,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  buttonDisabled: {
    backgroundColor: '#7dd3fc',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: colors.cyan,
    fontWeight: '600',
  },
});
