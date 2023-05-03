import { ModuleTagsComputed, ThisTags as This } from './types';

import { ModuleComputed } from '@dispatch-services/store/index';
import { TagType } from '@dispatch-services/db-forum-common/entities';

const tagOptions: ModuleComputed<This> = function () {
  return [
    TagType[TagType.Product],
    TagType[TagType.Organization],
    TagType[TagType.Fundraising],
    TagType[TagType.Category],
    TagType[TagType.Unknown],
  ];
};

export const computed: ModuleTagsComputed = {
  tagOptions,
};
