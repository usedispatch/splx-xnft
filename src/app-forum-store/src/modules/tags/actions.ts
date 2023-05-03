import { ModuleTagsActions, ThisTags as This } from './types';

import { ModuleAction } from '@dispatch-services/store';
import { useApi } from '../api';

const fetchTags: ModuleAction<This> = async function () {
  await useApi.actions.get(this.getters.fetchTagsConfig());
};

export const actions: ModuleTagsActions = {
  fetchTags,
};
