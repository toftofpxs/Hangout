import { Alert, Platform, ToastAndroid } from 'react-native';

export function showToast(message) {
  const text = String(message || '').trim();
  if (!text) return;

  if (Platform.OS === 'android') {
    ToastAndroid.show(text, ToastAndroid.LONG);
    return;
  }

  Alert.alert('Information', text);
}
