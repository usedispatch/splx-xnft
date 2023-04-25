import { EntityJson, EntityType } from './entities';

export interface EntityJsonResponse<T extends EntityType> {
  type: T;
  entities: Array<EntityJson<T>>;
}
