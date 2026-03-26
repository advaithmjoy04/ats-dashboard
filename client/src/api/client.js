import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ats_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (response?.data?.data !== undefined) {
    return { ...response, data: response.data.data };
  }
  return response;
});

export default api;
