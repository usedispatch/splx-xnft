import { ActionEntityJson, Crud } from '../actions/types';
import { EntityType, generateQueueItemId } from '../entities';

import { QueueType } from './types';

function shouldEnqueueProductFeedback(actionJson: ActionEntityJson) {
  const { action } = actionJson;
  const { crud, type } = action;
  return crud === Crud.Post && type === EntityType.ProductTopic;
}

export function getQueueTypesFromActionJson(actionJson: ActionEntityJson) {
  const queueTypes: QueueType[] = [];
  if (shouldEnqueueProductFeedback(actionJson)) {
    queueTypes.push(QueueType.ChatGptProductFeedback);
  }
  return queueTypes;
}

export function getQueuedMessageIdsFromActionJson(actionJson: ActionEntityJson) {
  const queueTypes = getQueueTypesFromActionJson(actionJson);
  return queueTypes.map((queueType) => generateQueueItemId(actionJson.actionId, queueType));
}
