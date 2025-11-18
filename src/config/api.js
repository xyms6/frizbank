const DEFAULT_BASE_URL = 'https://frizbank-backend.onrender.com';
const LOCAL_BASE_URL = '/api'; // Usa proxy do Vite em desenvolvimento

const normalizeBaseUrl = (url) => url.replace(/\/$/, '');

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = envBaseUrl
  ? normalizeBaseUrl(envBaseUrl)
  : isDevelopment
  ? LOCAL_BASE_URL
  : DEFAULT_BASE_URL;
