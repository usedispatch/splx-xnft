import { EntityJson, EntityType, generateCountId } from '@dispatch-services/db-forum-common/entities';
import { ModuleCountsGetters, ThisCounts as This } from './types';

import { CountJsonParams } from '@dispatch-services/db-forum-common/actions';
import { ModuleGetter } from '@dispatch-services/store';
import { useEntities } from '@dispatch-services/app-forum-store/modules/entities';
import { useLocalState } from '../local_state';

const getCount: ModuleGetter<This> = function () {
  return <I extends EntityJson<any> | string, E extends I | I[], K extends keyof CountJsonParams>(
    inputEntities: E,
    key: K
  ): E extends E[] ? number[] : number => {
    const isArray = Array.isArray(inputEntities);
    const entities: Array<EntityJson<any> | undefined> = (isArray ? inputEntities : [inputEntities]).map((i) =>
      typeof i === 'string' ? useEntities.getters.getEntity(i) : i
    );
    const counts = entities.map((entityJson) => {
      if (!entityJson) {
        return 0;
      }
      const countId = generateCountId(entityJson.id, entityJson.chainId);
      const c = useEntities.getters.getEntity(countId) as EntityJson<EntityType.Count> | undefined;
      const ct = (c?.[key] as number | undefined) ?? 0;
      // Then check pending for it.
      const pendingCt =
        (useLocalState.getters.getEditParams(countId)?.params[key as string] as number | undefined) ?? 0;
      return ct + pendingCt;
    });
    return (isArray ? counts : counts[0]) as E extends E[] ? number[] : number;
  };
};

export const getters: ModuleCountsGetters = {
  getCount,
};
