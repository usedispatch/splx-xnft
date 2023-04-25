import {
  EntityType,
  ParsedPostboxId,
  VerificationType,
  generateInteractionScoreId,
  generateProfileId,
  generateVerificationId,
  generateVerifiedEntityId,
  isPostboxId,
  parseId,
} from '../entities';
import {
  InteractionScoreParams,
  MergedActionLog,
  getTargetIdFromAction,
  getVerificationExternalIdFromLog,
  getVerificationTypeFromLog,
  isVerificationDisconnectLog,
  isVerificationLog,
  isVoteLog,
} from '../actions';
import { MAX_SCORE, VerificationMap } from './types';

import { EntitiesMap } from '../pending/types';
import { getEntityJson } from './entities';

function maybeMutateVerificationMap(log: MergedActionLog, verificationMap: VerificationMap) {
  if (!isVerificationLog(log)) {
    return;
  }
  const isDisconnect = isVerificationDisconnectLog(log);
  const externalId = getVerificationExternalIdFromLog(log) as string;
  const verificationId = externalId
    ? generateVerificationId(externalId, getVerificationTypeFromLog(log) as VerificationType)
    : '';
  if (!verificationId) {
    return;
  }
  if (!verificationMap[log.creatorId]) {
    verificationMap[log.creatorId] = {};
  }
  if (isDisconnect) {
    delete verificationMap[log.creatorId][verificationId];
    return;
  }
  verificationMap[log.creatorId][verificationId] = 1;
}

function getVerificationIds(log: MergedActionLog, entities: EntitiesMap, verificationMap: VerificationMap = {}) {
  const verifiedEntityId = generateVerifiedEntityId(log.creatorId);
  const verifiedEntityJson = getEntityJson<EntityType.VerifiedEntity>(verifiedEntityId, entities);
  const verifications = verifiedEntityJson?.verifications ?? [];
  const disconnected = verifiedEntityJson?.disconnected ?? [];
  const possibleVerifications = Object.keys(verificationMap[log.creatorId] ?? {});
  return [...new Set([...disconnected, ...verifications, ...possibleVerifications])];
}

export function hasInteractedBefore(
  targetId: string,
  log: MergedActionLog,
  entities: EntitiesMap,
  verificationMap: VerificationMap = {}
) {
  const { voteId, direct } = getTotalInteraction(targetId, log, entities, verificationMap);
  return isVoteLog(log) ? !!voteId : !!direct;
}

export function getModifiedScoreBasedOnPreviousInteractions(
  targetId: string,
  originalScore: number,
  log: MergedActionLog,
  entities: EntitiesMap,
  verificationMap: VerificationMap = {}
) {
  const { voteId, score } = getTotalInteraction(targetId, log, entities, verificationMap);
  if (voteId && isVoteLog(log) && targetId === getTargetIdFromAction(log)) {
    return 0;
  }
  if (originalScore + score > MAX_SCORE) {
    return MAX_SCORE - originalScore;
  }
  return originalScore;
}

function getTotalInteraction(
  targetId: string,
  log: MergedActionLog,
  entities: EntitiesMap,
  verificationMap: VerificationMap = {}
): InteractionScoreParams {
  const interactionScoreIds = getInteractionScoreIds(targetId, log, entities, verificationMap);
  return interactionScoreIds.reduce<InteractionScoreParams>(
    (acc, id) => {
      const entity = getEntityJson<EntityType.InteractionScore>(id, entities);
      if (entity) {
        acc.direct += entity.direct;
        acc.score += entity.score;
        if (!acc.voteId && entity.voteId) acc.voteId = entity.voteId;
      }
      return acc;
    },
    { direct: 0, score: 0, voteId: '' }
  );
}

/**
 * Get all of the interactions from all the verified entities for a single postbox/creatorId combo.
 * @param log
 * @param entities
 * @param verificationMap
 * @returns
 */
function getInteractionScoreIds(
  targetId: string,
  log: MergedActionLog,
  entities: EntitiesMap,
  verificationMap: VerificationMap
) {
  maybeMutateVerificationMap(log, verificationMap);
  targetId = targetId || getTargetIdFromAction(log);
  if (!isPostboxId(targetId)) {
    return [];
  }
  const verifications = getVerificationIds(log, entities, verificationMap);
  return verifications.reduce<string[]>((acc, verificationId) => {
    acc.push(generateInteractionScoreId(verificationId, targetId));
    return acc;
  }, []);
}

export function getInteractionScoreId(targetId: string, log: MergedActionLog, entities: EntitiesMap) {
  targetId = targetId || getTargetIdFromAction(log);
  if (!isPostboxId(targetId)) {
    return '';
  }
  const profile = getEntityJson<EntityType.Profile>(generateProfileId(log.creatorId), entities);
  if (!profile?.twitterUserId) {
    return '';
  }
  return generateInteractionScoreId(generateVerificationId(profile.twitterUserId, VerificationType.Twitter), targetId);
}

/**
 * Used in controller action mutate to make sure we fetch all the interaction score ids we need
 * @param log
 * @param entities
 * @param verificationMap
 * @returns
 */
export function getRelatedPostboxInteractionScoreIds(
  log: MergedActionLog,
  entities: EntitiesMap,
  verificationMap: VerificationMap = {}
) {
  maybeMutateVerificationMap(log, verificationMap);
  const targetId = getTargetIdFromAction(log);
  if (!isPostboxId(targetId)) {
    return [];
  }
  const verifications = getVerificationIds(log, entities, verificationMap);
  const postboxIds = (parseId(targetId) as ParsedPostboxId[]).map((i) => i.id);
  return verifications.reduce<string[]>((acc, verificationId) => {
    return postboxIds.reduce((acc, postboxId) => {
      acc.push(generateInteractionScoreId(verificationId, postboxId));
      return acc;
    }, acc);
  }, []);
}
