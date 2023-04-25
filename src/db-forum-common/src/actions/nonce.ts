import { numToHex } from '@dispatch-services/utils-common/string';
import { register } from '@dispatch-services/utils-common/singleton';

const keyPrefix = '@dispatch-services/db-forum-common/actions/nonce#';
// TODO(Partyman): better uuid (maybe uuid!)
const globals = register(() => ({ serverId: Date.now(), ct: 0 }), `${keyPrefix}globals`);

export function getNonce() {
  return `${numToHex(globals.serverId, 64)}${numToHex(globals.ct++, 64, true)}`;
}
