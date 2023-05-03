/* eslint-disable @typescript-eslint/no-empty-interface */
import { CountJsonParams } from '@dispatch-services/db-forum-common/actions';
import { EntityJson } from '@dispatch-services/db-forum-common/entities';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisCounts = ModuleApi<ModuleCountsState, ModuleCountsComputed, ModuleCountsGetters, ModuleCountsActions>;
// type This = ThisCounts;

export interface ModuleCountsState {}

export interface ModuleCountsComputed {}

export interface ModuleCountsGetters {
  getCount: () => <I extends EntityJson<any> | string, E extends I | I[], K extends keyof CountJsonParams>(
    entity: E,
    key: K
  ) => E extends E[] ? number[] : number;
}

export interface ModuleCountsActions {}
