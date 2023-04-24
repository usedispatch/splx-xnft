import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios';

import { Json } from './json';

export interface RequestConfig extends AxiosRequestConfig {
  subDirectories?: Json;
  token?: string;
  errorHandler?: (error: AxiosError, config: RequestConfig) => void;
}

export interface ApiRequestConfig extends RequestConfig {
  actionKey?: string;
  cacheTime?: number; // Do not refetch within cacheTime ms.
  timeout?: number; // Do not wait longer than timeout for a response.
}
