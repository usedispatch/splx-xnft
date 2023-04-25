import { ActionParams, Crud } from '@dispatch-services/db-forum-common/actions/types';
import { EntityJson, EntityType } from '@dispatch-services/db-forum-common/entities/types';

export interface ActiveMap {
  [normalizedId: string]: string;
}

export interface EntitiesMap {
  [id: string]: EntityJson<any> | undefined;
}

export interface EditMapValue {
  params: ActionParams<any> | Partial<ActionParams<any>>;
  properties?: Partial<EntityJson<any>>;
  crud: Crud;
}

export interface EditMap {
  [id: string]: EditMapValue;
}

export type MutatePendingReturn<C extends Crud, T extends EntityType> = C extends Crud.Post
  ? EntityJson<T>
  : ActionParams<T>;
