import { TagActionParams } from '@dispatch-services/db-forum-common/actions/types';
import { TagType } from '@dispatch-services/db-forum-common/entities/types';
import { generateTagId } from '@dispatch-services/db-forum-common/entities';

export function tagsParamsToTagIds(params: TagActionParams[]): string[] {
  const ids = params.reduce<string[]>((acc, { displayName, tagType }) => {
    // Note(partyman): Put moar checking here.
    if (TagType[tagType]) {
      acc.push(generateTagId(displayName, tagType));
    }
    return acc;
  }, []);
  return [...new Set(ids)];
}
