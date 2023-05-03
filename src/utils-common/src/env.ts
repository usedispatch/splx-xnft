import { getStringTemplateCaptures, isJsonString, resolveStringTemplate } from './string';

import { Json } from './json';
import { getGlobal } from './global';
import { isEmpty } from 'lodash';
import { register } from './singleton';

export enum Realm {
  local = 'local',
  dev = 'dev',
  prod = 'prod',
}

interface NormalizedEnvKeys {
  [baseKey: string]: string[];
}

export interface EnvOptions {
  envPrefix?: string;
  envListDelim?: string;
  maxDepth?: number;
  envRealm: Realm;
}

const defaultOptions: EnvOptions = {
  envPrefix: '@dispatch-services',
  envListDelim: ',',
  maxDepth: 25,
  envRealm: Realm.local,
};

const keyPrefix = '@dispatch-services/utils-common/env#';
const normalizedEnvKeys: NormalizedEnvKeys = register(() => ({}), `${keyPrefix}normalizedEnvKeys`);

export function isBrowser() {
  return !!getGlobal().document;
}

export function isWebWorker() {
  return getGlobal()?.constructor?.name === 'DedicatedWorkerGlobalScope';
}

export function isNode() {
  return !isBrowser() && !isWebWorker();
}

export function isClient() {
  return isBrowser() || isWebWorker();
}

export function userAgent() {
  return isBrowser() ? getGlobal().navigator.userAgent.toLowerCase() : '';
}

export enum BrowserEnv {
  NOT_BROWSER,
  UNKNOWN,
  IE,
  IOS,
}

const browserReg: Map<BrowserEnv, RegExp> = new Map([
  [BrowserEnv.IE, /msie|trident/],
  [BrowserEnv.IOS, /iphone|ipad|ipod|ios/],
]);

function sniffBrowserEnv() {
  const ua = userAgent();
  if (!ua) {
    return BrowserEnv.NOT_BROWSER;
  }
  for (const [type, reg] of browserReg) {
    if (reg.test(ua)) {
      return type;
    }
  }
  return BrowserEnv.UNKNOWN;
}

export function isIe() {
  return sniffBrowserEnv() === BrowserEnv.IE;
}

export function isIos() {
  return sniffBrowserEnv() === BrowserEnv.IOS;
}

const nativeReg = /native code/;
export function isNative(Ctor: any): boolean {
  return typeof Ctor === 'function' && nativeReg.test(Ctor.toString());
}

export function isDevelopment() {
  return getEnv('NODE_ENV') === 'development' || process.env.NODE_ENV === 'development';
}

export function isTest() {
  return parseInt(getEnv('IS_TEST') ?? '0') === 1;
}

export function isReactiveEnv(): boolean {
  return isBrowser() || isTest() || isDevelopment();
}

export function isLocal() {
  return isTest() || isDevelopment();
}

export function getRealm() {
  return getEnv('REALM') || process.env.SOLARPLEX_REALM || process.env.REALM;
}

export function isLocalRealm() {
  return getRealm() === Realm.local;
}

export function isDevRealm() {
  return getRealm() === Realm.dev;
}

export function isProdRealm() {
  return getRealm() === Realm.prod;
}

export function getProdForumActionId() {
  return getEnv('PROD_DEFAULT_FORUM_ACTION_ID') || process.env.NEXT_PUBLIC_PROD_DEFAULT_FORUM_ACTION_ID;
}

export function getDevForumActionId() {
  return getEnv('DEV_DEFAULT_FORUM_ACTION_ID') || process.env.NEXT_PUBLIC_DEV_DEFAULT_FORUM_ACTION_ID;
}

export function getLocalForumActionId() {
  return getEnv('DEFAULT_FORUM_ACTION_ID') || process.env.NEXT_PUBLIC_DEFAULT_FORUM_ACTION_ID;
}

// used for nextjs, doesn't suppor getEnv
export function getForumActionId() {
  switch (getRealm()) {
    case Realm.prod:
      return getProdForumActionId();
    case Realm.dev:
      return getDevForumActionId();
    default:
      return getLocalForumActionId();
  }
}

// export function isJsDom() {
//   return (
//     window?.name === 'nodejs' || navigator?.userAgent?.includes('Node.js') || navigator?.userAgent?.includes('jsdom')
//   );
// }

const clientPrefixes = ['NEXT_PUBLIC_', 'REACT_APP_'];

function getClientPrefix(upperKey: string) {
  for (let i = 0; i < clientPrefixes.length; i++) {
    if (upperKey.startsWith(clientPrefixes[i])) {
      return clientPrefixes[i];
    }
  }
  return '';
}

function getOptionsPrefix(upperKey: string, { envPrefix }: EnvOptions) {
  if (!envPrefix || !upperKey.startsWith(envPrefix.toUpperCase())) {
    return '';
  }
  return envPrefix;
}

function parseEnvKey(upperKey: string, options: EnvOptions) {
  const clientPrefix = getClientPrefix(upperKey);
  let baseKey = upperKey.slice(clientPrefix.length);
  // do the same as above but with "getOptionsPrefix"
  const optionsPrefix = getOptionsPrefix(baseKey, options);
  baseKey = baseKey.slice(optionsPrefix.length);

  const clientKeys = clientPrefixes.reduce<string[]>((acc, prefix) => {
    acc.push(`${prefix}${baseKey}`);
    return acc;
  }, []);

  // Do the same for the optionsPrefix here.
  const prefixFromOptions = (options.envPrefix ?? '').toUpperCase();
  const optionsClientKeys = clientPrefixes.reduce<string[]>((acc, clientPrefix) => {
    acc.push(`${clientPrefix}${prefixFromOptions}${baseKey}`);
    return acc;
  }, []);
  // Always prefer the options+client, then client;
  let keys: string[] = [...optionsClientKeys, ...clientKeys];
  if (isClient()) {
    // Always prefer client prefixed values.
    prefixFromOptions && keys.push(`${prefixFromOptions}${baseKey}`);
    keys.push(baseKey);
  } else {
    keys.unshift(baseKey);
    prefixFromOptions && keys.unshift(`${prefixFromOptions}${baseKey}`);
  }
  // If they passed in a specific prefixed-key, prefer that value first.
  if (baseKey !== upperKey) keys.unshift(upperKey);
  keys = [...new Set(keys)];
  // Now add a lookup for the key to return this sorted list of keys.
  normalizedEnvKeys[upperKey] = keys;
}

function getEnvKeys(upperKey: string, options: EnvOptions) {
  if (!normalizedEnvKeys[upperKey]) {
    parseEnvKey(upperKey, options);
  }
  return normalizedEnvKeys[upperKey];
}

function getRawEnvValue(key: string, options: EnvOptions) {
  const upperKey = key.toUpperCase();
  let keys: string[] = [];
  if (upperKey === 'NODE_ENV' || upperKey === 'BASE_URL') {
    keys.push(upperKey);
  } else {
    keys = getEnvKeys(upperKey, options);
  }
  let v: string = '';
  for (let i = 0; i < keys.length; i++) {
    v = process.env[keys[i]] ?? '';
    if (v) break;
  }
  return v;
}

function resolveTemplates(value: string, options: EnvOptions) {
  const maxDepth = (options.maxDepth ?? defaultOptions.maxDepth) as number;
  let depth = 0;
  let done = false;
  let substitutions = { ...process.env };
  while (!done) {
    const captures = getStringTemplateCaptures(value).reduce<{ [capture: string]: string }>((acc, capture) => {
      acc[capture] = getRawEnvValue(capture.toUpperCase(), options);
      return acc;
    }, {});
    const hasCaptures = !isEmpty(captures);
    if (hasCaptures) {
      substitutions = { ...substitutions, ...captures };
      value = resolveStringTemplate(value, substitutions);
    }
    depth++;
    done = depth >= maxDepth || !hasCaptures;
  }
  return value;
}

function parseEnvValue(value: string, options: EnvOptions) {
  value = resolveTemplates(value, options);
  if (isJsonString(value)) {
    return JSON.parse(value);
  }
  return value;
}

function getEnvValue(keyUpper: string, options: EnvOptions) {
  const rawValue = getRawEnvValue(keyUpper, options);
  return parseEnvValue(rawValue, options);
}

export function setEnv<T extends string | number | Json, V extends T | T[]>(
  inputKey: string,
  inputValue: V,
  options: EnvOptions = defaultOptions
) {
  const upperKey = getEnvKeys(inputKey.toUpperCase(), options)[0];
  const value = (typeof inputValue === 'object' ? JSON.stringify(inputValue) : inputValue) as string;
  process.env[upperKey] = value;
}

export function getEnv<K extends string | string[], T extends string | number | Json>(
  key: K,
  options: EnvOptions = defaultOptions
) {
  const isArray = Array.isArray(key);
  const keys = isArray ? key : [key];
  const values = keys.map((k) => getEnvValue(k.toUpperCase(), options));
  return (isArray ? values : values[0]) as K extends string[] ? T[] : T;
}
