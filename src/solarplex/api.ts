
const API_URL = 'https://dev.api.solarplex.xyz/entities/forum/yjtu_Y1CgN98OJOF/topics';

export async function fetchForum() {
  return fetch(API_URL).then((r) => r.json());
}