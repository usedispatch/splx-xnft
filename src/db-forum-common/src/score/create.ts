import {
  ActionEntityJson,
  Crud,
  VoteActionParams,
  generateIdFromLog,
  getTargetIdFromAction,
  isVerificationDisconnectLog,
  isVerificationLog,
} from '../actions';
import {
  EntityJson,
  EntityType,
  ParsedPostboxId,
  PostboxEntityType,
  generateVerifiedEntityId,
  isPostboxEntity,
  isPostboxId,
  parseId,
} from '../entities';
import { getEntityJson, isVerifiedUser } from './entities';
import { getInteractionScoreId, getModifiedScoreBasedOnPreviousInteractions } from './interactions';

import { EntitiesMap } from '../pending/types';
import { ScoreMap } from './types';
import { byBlockOrder } from '../sort';
import { getCountIdFromId } from '../counts';
import { parseBlockOrder } from '../block_order';

const ANON_MULT = 1 / 100; // Multiplier to anonymous users end score.
const CREATOR_MULT = 1 / 5; // Multiplier to points a creator gets from interactions on their postbox.
const DAY_MULT = 1 / 5; // Multiplier to number of days verified account has been a user.
const DEPTH_MULT = 1 / 2; // Multiplier to postbox score as it travels up chain.

function getDays(fromTimeSec: number, toTimeSec: number) {
  if (!fromTimeSec) {
    fromTimeSec = toTimeSec;
  }
  return Math.floor((toTimeSec - fromTimeSec) / 86400);
}

function userAgeDays<A extends ActionEntityJson>(userId: string, actionJson: A, entities: EntitiesMap) {
  const userJson = getEntityJson<EntityType.User>(userId, entities);
  const created = userJson?.blockOrder ? parseBlockOrder(userJson.blockOrder).timestamp : 0;
  return getDays(created, actionJson.time);
}

function isVerification<A extends ActionEntityJson>(actionJson: A, entities: EntitiesMap) {
  const isVerificationAction = isVerificationLog(actionJson as any) && !isVerificationDisconnectLog(actionJson as any);
  const verifiedEntityId = generateVerifiedEntityId(actionJson.creatorId);
  const verifiedEntity = getEntityJson<EntityType.VerifiedEntity>(verifiedEntityId, entities);
  return isVerificationAction && verifiedEntity?.blockOrder === actionJson.blockOrder;
}

function setScoreInScoreMap<A extends ActionEntityJson>(
  score: number,
  id: string,
  scores: ScoreMap,
  actionJson: A,
  entities: EntitiesMap
) {
  if (!canUpdateScore(id, actionJson, entities)) {
    return;
  }
  if (!scores[id]) {
    scores[id] = 0;
  }
  const isPostboxScore = isPostboxId(id);
  // TODO(Partyman): At one point we'll want to limit the score a user can have on another in a certain amount of time
  // (if it looks like people try to game it that way).
  // const isUserScore = !isPostboxScore && actionJson.creatorId === id;
  // const isCreatorScore = !isPostboxScore && !isUserScore;
  if (isPostboxScore) {
    score = getModifiedScoreBasedOnPreviousInteractions(id, score, actionJson as any, entities);
    const interactionScoreId = getInteractionScoreId(id, actionJson as any, entities);
    if (interactionScoreId) {
      scores[interactionScoreId] = score;
    }
  }
  scores[id] += score;
}

function getUserScoresFromAction<A extends ActionEntityJson>(actionJson: A, entities: EntitiesMap) {
  const scores: ScoreMap = {};
  const isVerificationAction = isVerification(actionJson, entities);
  const canIncreaseUserScore = isVerificationAction || actionJson.action.crud === Crud.Post;
  if (!canIncreaseUserScore) {
    return scores;
  }
  let score = 0;
  switch (actionJson.action.type) {
    case EntityType.Profile: {
      if (isVerificationAction) {
        score += 25;
      }
      break;
    }
    case EntityType.ProductTopic: {
      score += 35;
      break;
    }
    case EntityType.Topic:
    case EntityType.Post: {
      score += 5;
      break;
    }
    case EntityType.Vote: {
      score += (actionJson.action.params as VoteActionParams).value > 0 ? 1 : 0;
      break;
    }
  }
  const isVerifiedCreator = isVerifiedUser(actionJson.creatorId, entities);
  if (isPostboxEntity(actionJson.action.type) && isVerifiedCreator) {
    score += DAY_MULT * (userAgeDays(actionJson.creatorId, actionJson, entities) || 1);
  }
  if (!isVerifiedCreator && !isVerificationAction) {
    score *= ANON_MULT;
  }
  setScoreInScoreMap(score, actionJson.creatorId, scores, actionJson, entities);
  return scores;
}

function canUpdateScore<A extends ActionEntityJson>(id: string, actionJson: A, entities: EntitiesMap) {
  const { chainId, blockOrder } = actionJson;
  const countId = getCountIdFromId(id, chainId);
  const count = getEntityJson<EntityType.Count | EntityType.CountUser>(countId, entities);
  if (!count) {
    return;
  }
  return count.updatedBlockOrder.localeCompare(blockOrder) <= 0;
}

function getPostboxScoresFromAction<A extends ActionEntityJson>(actionJson: A, entities: EntitiesMap) {
  const scores: ScoreMap = {};
  if (!isPostboxEntity(actionJson.action.type) || actionJson.action.crud !== Crud.Post) {
    return scores;
  }
  // As the depth decreases, divide score by 2.
  const targetId = getTargetIdFromAction(actionJson) || generateIdFromLog(actionJson as any);
  let baseScore = 0;
  switch (actionJson.action.type) {
    case EntityType.Topic:
    case EntityType.ProductTopic: {
      baseScore += 3;
      break;
    }
    case EntityType.Post: {
      baseScore += 2;
      break;
    }
    case EntityType.Vote: {
      baseScore += (actionJson.action.params as VoteActionParams).value > 0 ? 1 : 0;
      break;
    }
    default: {
      break;
    }
  }
  const parsedId = [...(parseId(targetId) as ParsedPostboxId[])].reverse();
  const creators = parsedId.reduce<{ [id: string]: 1 }>((acc, parsedPostboxId) => {
    const postbox = getEntityJson<PostboxEntityType>(parsedPostboxId.id, entities);
    if (postbox) {
      acc[postbox.creatorId] = 1;
    }
    return acc;
  }, {});
  let divider = 1;
  for (let i = 0; i < parsedId.length; i++) {
    const postboxId = parsedId[i].id;
    const postbox = getEntityJson<PostboxEntityType>(postboxId, entities);
    let score = baseScore;
    const isVerifiedCreator = isVerifiedUser(actionJson.creatorId, entities);
    const isVerifiedParentCreator = !!postbox && isVerifiedUser(postbox.creatorId, entities);
    if (postbox && postbox?.creatorId !== actionJson.creatorId && isVerifiedParentCreator && isVerifiedCreator) {
      // Then multiply the score by the number of days the action's creator has been active.
      score += DAY_MULT * (userAgeDays(actionJson.creatorId, actionJson, entities) || 1);
    }
    score *= divider;
    if (!isVerifiedCreator) {
      score *= ANON_MULT;
    }
    if (postbox && canUpdateScore(postbox.id, actionJson, entities)) {
      setScoreInScoreMap(score, postbox.id, scores, actionJson, entities);
      if (!creators[actionJson.creatorId]) {
        // If it's a new interaction in that thread, then reward the users.
        score *= CREATOR_MULT;
        if (!isVerifiedParentCreator) {
          score *= ANON_MULT;
        }
        setScoreInScoreMap(score, postbox.creatorId, scores, actionJson, entities);
      }
    }
    divider *= DEPTH_MULT;
  }
  return scores;
}

function getScoresFromAction<A extends ActionEntityJson>(actionJson: A, entities: EntitiesMap) {
  const scores: ScoreMap[] = [];
  if (isVerification(actionJson, entities)) {
    scores.push(getUserScoresFromAction(actionJson, entities));
  } else if (actionJson.action.crud === Crud.Post) {
    scores.push(getUserScoresFromAction(actionJson, entities));
    scores.push(getPostboxScoresFromAction(actionJson, entities));
  }
  return scores;
}

export function getScoresForActions<A extends EntityJson<EntityType.Action>>(actionArray: A[], entities: EntitiesMap) {
  const actionJsonArray = actionArray.reduce<A[]>((acc, action) => {
    if (action) {
      // Handle models passed in from a db-forum controller.
      acc.push((action as any).json ?? action);
    }
    return acc;
  }, []);
  // first sort.
  actionJsonArray.sort(byBlockOrder);
  return actionJsonArray.map((actionJson) => getScoresFromAction(actionJson, entities));
}
