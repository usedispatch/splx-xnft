import { Json } from './json';
import { register } from './singleton';

const keyPrefix = '@dispatch-services/utils-common/local_cache#';
const local: Json = register(() => ({}), `${keyPrefix}localCache`);

interface LocalCacheObject {
  value: any;
  time: number;
}

function createLocal(value: any, time: number = Date.now()): LocalCacheObject {
  return { value, time };
}

export function getRawLocalValue(key: string, ttl: number = -1, now: number = Date.now()): any {
  const { value, time } = local[key] ?? createLocal(undefined, 0);
  if (ttl > 0 && now - time >= ttl) {
    delete local[key];
    return undefined;
  }
  return value;
}

export function getLocalValue(key: string, ttl: number = -1, now: number = Date.now()): any | undefined {
  const value = getRawLocalValue(key, ttl, now);
  if ((value || value === 0) && Object.prototype.hasOwnProperty.call(value, 'cacheOrigin')) {
    value.fromLocalCache = true;
  }
  return value;
}

export function setLocalValue(key: string, value: any, now: number = Date.now()) {
  local[key] = createLocal(value, now);
}

export function invalidateLocal(keyOrKeys: string | string[]) {
  const keys: string[] = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  for (let i = 0; i < keys.length; i++) {
    delete local[keys[i]];
  }
}

export function clearLocal() {
  Object.keys(local).forEach((key) => delete local[key]);
}
