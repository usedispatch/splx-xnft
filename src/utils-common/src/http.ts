import { Json, omit } from './json';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios';

export type { AxiosError, AxiosResponseHeaders, AxiosResponse } from 'axios';

const urlParamsReg = /:([^:|/]+)/g;

export interface RequestConfig extends AxiosRequestConfig {
  subDirectories?: Json;
  token?: string;
  errorHandler?: (error: AxiosError, config: RequestConfig) => void;
}

interface ParsedRequestConfig {
  method?: string;
  baseUrl?: string;
  url?: string;
  headers?: { [key: string]: any };
}

function parseSubdirectories(url: string, subDirectories: Json) {
  return url.replace(urlParamsReg, (match, sub) => subDirectories[sub] ?? match);
}

function getAuthorizationHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function parseRequestConfig(method: string, requestConfig: RequestConfig) {
  const parsedConfig: ParsedRequestConfig = {
    method,
    url: parseSubdirectories(requestConfig.url ?? '', requestConfig.subDirectories ?? {}),
  };
  if (requestConfig.token) {
    parsedConfig.headers = { ...requestConfig.headers, ...getAuthorizationHeader(requestConfig.token) };
  }
  return parsedConfig;
}

function getRequestConfig(method: Method, requestConfig: RequestConfig): AxiosRequestConfig {
  return omit(
    {
      ...{ method: 'get', baseURL: '' },
      ...requestConfig,
      ...parseRequestConfig(method, requestConfig),
    },
    'subDirectories',
    'token',
    'errorHandler'
  );
}

function handleAxiosError(error: AxiosError, config: RequestConfig, logit: boolean = false) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { data, status, headers } = error.response;
    logit && console.log(data);
    logit && console.log(status);
    if (status === 401 && config.token) {
      console.warn('Make sure we unset the JWT here!!');
    }
    logit && console.log(headers);
    // If this is client side, update the server time here.
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    logit && console.log(error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    logit && console.log('Error', error.message);
  }
  logit && console.log(error.config);
}

async function request(method: Method, config: RequestConfig): Promise<AxiosResponse> {
  const requestConfig = getRequestConfig(method, config);
  try {
    const response = await axios(requestConfig);
    return response;
  } catch (err) {
    await (config.errorHandler ?? handleAxiosError)(err as AxiosError, config);
    throw err as AxiosError;
  }
}

export async function get(config: RequestConfig) {
  return await request('get', config);
}

export async function post(config: RequestConfig) {
  return await request('post', config);
}

// Temp
export interface _ForumInfo {
  title: string;
  description: string;
}
