import { PostboxEntityJson } from './entities';
import { normalizeTwitter } from '@dispatch-services/utils-common/string';

export function hasBuilder(entityJson: PostboxEntityJson, twitter: string) {
  if (!twitter) {
    return false;
  }
  const handle = normalizeTwitter(twitter);
  return !!entityJson.mentions.find((i) => normalizeTwitter(i) === handle);
}
