import { ActionCreateInput } from '@dispatch-services/db-forum-common/actions';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisApp = ModuleApi<ModuleAppState, ModuleAppComputed, ModuleAppGetters, ModuleAppActions>;
type This = ThisApp;

export interface ModuleAppState {
  example: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleAppComputed {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleAppGetters {}

export interface ModuleAppActions {
  redirect: (this: This, actionInput: ActionCreateInput<any, any>) => Promise<void>;
  gatedNavigation: (this: This, href: string) => Promise<void>;
}
