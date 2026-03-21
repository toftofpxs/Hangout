// utils/auth.js
export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const decodeToken = (token) => {
  try {
    // Un token JWT a 3 parties séparées par des points
    const payload = token.split('.')[1];
    const decodedPayload = atob(payload); // Décode base64
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Erreur décodage token:', error);
    return null;
  }
};

// Optionnel: Vérifier si le token est expiré
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};