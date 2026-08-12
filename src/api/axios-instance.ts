import axios, { type AxiosRequestConfig } from 'axios';

export const AXIOS_INSTANCE = axios.create({
  baseURL: 'https://distribution-backend-ywul.onrender.com',
});

export const customInstance = (config: AxiosRequestConfig): Promise => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return AXIOS_INSTANCE(config).then((response) => response.data);
};