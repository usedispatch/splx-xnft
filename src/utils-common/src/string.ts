import { cloneDeepWith, get, isString } from 'lodash';

import CryptoJs from 'crypto-js/core';
import { Json } from './json';
import MD5 from 'crypto-js/md5';
import base64 from 'crypto-js/enc-base64url';
import keccak from 'crypto-js/sha3';
import { register } from './singleton';
import sha256 from 'crypto-js/sha256';
import { solidityPack } from 'ethers/lib/utils';

export { camelCase } from 'lodash';

const keyPrefix = '@dispatch-services/utils-common/string#';
const { hexToNumMap, numToHexMap } = register(() => {
  const hexToNumMap: { [hex: string]: number } = {};
  const numToHexMap: { [num: number]: { [bits: number]: string } } = {};
  return { hexToNumMap, numToHexMap };
}, `${keyPrefix}global`);

const templateReg = /\${([^}]+)}/g;

export function b64toBlob(dataUri: string) {
  // convert base64/URLEncoded data component to raw binary data held in a string
  let byteString;
  if (dataUri.split(',')[0].includes('base64')) byteString = atob(dataUri.split(',')[1]);
  else byteString = unescape(dataUri.split(',')[1]);

  // write the bytes of the string to a typed array
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], { type: 'application/octet-stream' });
}

export function getStringTemplateCaptures(str: string) {
  const captures: string[] = [];
  str.replace(templateReg, (substring, capture) => {
    captures.push(capture);
    return substring;
  });
  return captures;
}

export function resolveStringTemplate(str: string, substitutions: Json) {
  return str.replace(templateReg, (substring, capture) => {
    return get(substitutions, capture, substring);
  });
}

export function resolveAllStringTemplates(input: string | Json, substitutions: Json) {
  return cloneDeepWith(input, (value) => {
    if (!isString(value)) {
      return;
    }
    return resolveStringTemplate(value, substitutions);
  });
}

const capitalReg = /[A-Z]+?[A-Z]*/g;
export function camelToSnakeCase(str: string) {
  return str.replace(capitalReg, '_$&');
}

const snakeReg = /_/g;
const dashReg = /(?:^|-)([a-zA-Z])/g;
export function toCapitalCase(str: string) {
  return camelToSnakeCase(str)
    .replace(snakeReg, '-')
    .replace(dashReg, (_m, m) => m.toUpperCase());
}

const capReg = /[A-Z]/g;
export function capitalCaseToSnakeCase(str: string) {
  return str.replace(capReg, (m, idx) => `${idx > 0 ? '_' : ''}${m.toLowerCase()}`);
}

const spaceReg = /\+/g;
export function toSnakeCase(str: string) {
  return capitalCaseToSnakeCase(toCapitalCase(str.trim().replace(spaceReg, '_')));
}

const boundaryReg = /\b\S/g;
export function toUpperSpaceCase(str: string) {
  return toSnakeCase(str)
    .replace(snakeReg, ' ')
    .replace(boundaryReg, (m) => m.toUpperCase());
}

const specialReg = /^[A-Za-z0-9+_-]+$/;
export function checkSpecialChars(str: string): boolean {
  return specialReg.test(str);
}

export function md5(str: string, cfg?: object): string {
  return MD5(str, cfg).toString();
}

export function SHA256(str: string, cfg?: object): string {
  return sha256(str, cfg).toString();
}

export function isJsonString(str: string) {
  return str && (str[0] === '{' || str[0] === '[' || str[0] === '"');
}

const atReg = /^\s*@/g;

export function normalizeTwitter(twitterHandle: string) {
  return twitterHandle.replace(atReg, '').toLowerCase();
}

/**
 * Pack numbers together.
 * @param input : Array[number, bits]
 * @returns string
 */

export function pack(input: Array<[number, number]>) {
  const bits = input.map(([num, bits]) => `uint${bits}`);
  const numbers = input.map(([num, bits]) => num);
  return solidityPack(bits, numbers).slice(2);
}

export function numToHex(num: number, bits: number = 64, ignoreCache: boolean = false) {
  if (!numToHexMap[bits]) {
    numToHexMap[bits] = {};
  }
  if (!numToHexMap[bits][num] || ignoreCache) {
    const hex = solidityPack([`uint${bits}`], [num]).slice(2);
    if (ignoreCache) return hex;
    numToHexMap[bits][num] = hex;
  }
  return numToHexMap[bits][num];
}

export function hexToNum(hex: string, ignoreCache: boolean = false) {
  if (!hex) {
    return -1;
  }
  const normHex = `0x${hex.startsWith('0x') ? hex.slice(2) : hex}`;
  if (!hexToNumMap[normHex] || ignoreCache) {
    const num = parseInt(normHex);
    if (ignoreCache) return num;
    hexToNumMap[normHex] = num;
  }
  return hexToNumMap[normHex];
}

export function toHash64(input: string, bytes: number, useVanilla: boolean = false) {
  // Bytes needs to be a multiple of 4 to make this easy. Could do this later if we want differnt.
  // https://gist.github.com/artjomb/7ef1ee574a411ba0dd1933c1ef4690d1
  const hash256 = (useVanilla ? sha256 : keccak)(input, { outputLength: 256 });
  const trunc = CryptoJs.lib.WordArray.create(hash256.words.slice(0, bytes / 4), bytes);
  return base64.stringify(trunc);
}

export function bufferToString(buffer: Buffer) {
  return new TextDecoder().decode(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

export function stringToUint8Array(str: string) {
  return new TextEncoder().encode(str);
}

export function stringToHex(str: string) {
  let hex: string, i: number;
  let result = '';
  for (i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += `000${hex}`.slice(-4);
  }

  return result;
}

const hexReg = /.{1,4}/g;
export function hexToString(str: string) {
  let j: number;
  const hexes = str.match(hexReg) ?? [];
  let back = '';
  for (j = 0; j < hexes.length; j++) {
    back += String.fromCharCode(parseInt(hexes[j], 16));
  }
  return back;
}
