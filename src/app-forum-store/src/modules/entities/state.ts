import { ModuleEntitiesState } from './types';

export const name = 'entities';

export function getInitialState(): ModuleEntitiesState {
  return {
    entities: {},
    actionIdToEntityId: {},
  };
}
