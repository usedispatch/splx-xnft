import { get as _get, isEmpty as _isEmpty, omit as _omit, mergeWith } from 'lodash';

export type JsonKey = string | number | symbol;
export interface Json {
  [key: JsonKey]: any;
}

export { merge, pickBy } from 'lodash';

type UniqueKey = string | string[] | ((item: Json) => string);

export function isJsonKey(key: any) {
  return typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol';
}

export function isEmpty(value: any) {
  return _isEmpty(value);
}

export function omit(json: Json | null | undefined, ...paths: string[]) {
  return _omit(json, ...paths);
}

export function get(item: Json, uniqueKey: UniqueKey) {
  if (typeof uniqueKey === 'string') {
    return _get(item, uniqueKey);
  }

  if (typeof uniqueKey === 'function') {
    return uniqueKey(item);
  }

  if (Array.isArray(uniqueKey)) {
    for (let i = 0; i < uniqueKey.length; i += 1) {
      const value = _get(item, uniqueKey[i]);
      if (value) return value;
    }
  }
  return undefined;
}

function dedupeAndConcatArraysByKey(uniqueKey: UniqueKey) {
  return (leftValue: any, rightValue: any) => {
    if (!Array.isArray(leftValue) || !Array.isArray(rightValue)) {
      return undefined;
    }
    const map = new Map();
    const a = [...new Set([...leftValue, ...rightValue])];
    return a.reduce<any[]>((acc, item) => {
      const value = get(item, uniqueKey);
      if (typeof item === 'object' && value) {
        if (!map.has(value)) {
          map.set(value, acc.length);
          acc.push({});
        }
        acc[map.get(value)] = mergeJsonWithUniqueKey(uniqueKey, acc[map.get(value)], item);
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  };
}

export function mergeJsonWithUniqueKey(uniqueKey: UniqueKey, ...jsonObjects: Json[]) {
  return mergeWith({}, ...jsonObjects, dedupeAndConcatArraysByKey(uniqueKey));
}

function dedupeAndConcatArraysByValue(leftValue: any, rightValue: any) {
  if (!Array.isArray(leftValue) || !Array.isArray(rightValue)) {
    return undefined;
  }
  return [...new Set([...leftValue, ...rightValue])];
}

export function mergeJson(...jsonObjects: object[]): object {
  return mergeWith({}, ...jsonObjects, dedupeAndConcatArraysByValue);
}

const hop = Object.prototype.hasOwnProperty;
export function hasOwn(o: any, key: PropertyKey) {
  return o && !!hop.call(o, key);
}
