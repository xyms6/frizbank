const DEFAULT_BASE_URL = 'https://frizbank-backend.onrender.com';

const normalizeBaseUrl = (url) => url.replace(/\/$/, '');

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = envBaseUrl
  ? normalizeBaseUrl(envBaseUrl)
  : DEFAULT_BASE_URL;
