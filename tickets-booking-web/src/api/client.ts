import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with a non-2xx status — propagate as-is so callers
      // can inspect error.response.status and error.response.data.
      return Promise.reject(error);
    }

    if (error.request) {
      // Request was made but no response received (network error / timeout).
      return Promise.reject(new Error('Sem resposta do servidor. Verifique sua conexão.'));
    }

    // Something went wrong setting up the request.
    return Promise.reject(new Error('Erro ao configurar a requisição.'));
  }
);
