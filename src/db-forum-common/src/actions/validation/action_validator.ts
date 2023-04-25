import { Action, Crud } from '../types';
import {
  AdminEditSchema,
  AdminSchema,
  ForumEditSchema,
  ForumSchema,
  PostEditSchema,
  PostSchema,
  ProfileEditSchema,
  ProfileSchema,
  RestrictionEditSchema,
  RestrictionRuleEditSchema,
  RestrictionRuleSchema,
  RestrictionSchema,
  TopicEditSchema,
  TopicSchema,
  UserEditSchema,
  UserSchema,
  VoteEditSchema,
  VoteSchema,
  WalletEditSchema,
  WalletSchema,
} from './schema';

import { EntityType } from '@dispatch-services/db-forum-common/entities';

function isValidAdminAction<T extends EntityType.Admin>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? AdminSchema.validate(action) : AdminEditSchema.validate(action);
  return errors;
}

function isValidForumAction<T extends EntityType.Forum>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? ForumSchema.validate(action) : ForumEditSchema.validate(action);
  return errors;
}

function isValidPostAction<T extends EntityType.Post>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? PostSchema.validate(action) : PostEditSchema.validate(action);
  return errors;
}

function isValidProfileAction<T extends EntityType.Profile>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? ProfileSchema.validate(action) : ProfileEditSchema.validate(action);
  return errors;
}

function isValidRestrictionAction<T extends EntityType.Restriction>(action: Action<T>) {
  const errors =
    action.crud === Crud.Post ? RestrictionSchema.validate(action) : RestrictionEditSchema.validate(action);
  return errors;
}

function isValidRestrictionRuleAction<T extends EntityType.RestrictionRule>(action: Action<T>) {
  const errors =
    action.crud === Crud.Post ? RestrictionRuleSchema.validate(action) : RestrictionRuleEditSchema.validate(action);
  return errors;
}

function isValidTopicAction<T extends EntityType.Topic>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? TopicSchema.validate(action) : TopicEditSchema.validate(action);
  return errors;
}

function isValidUserAction<T extends EntityType.User>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? UserSchema.validate(action) : UserEditSchema.validate(action);
  return errors;
}

function isValidVoteAction<T extends EntityType.Vote>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? VoteSchema.validate(action) : VoteEditSchema.validate(action);
  return errors;
}

function isValidWalletAction<T extends EntityType.Wallet>(action: Action<T>) {
  const errors = action.crud === Crud.Post ? WalletSchema.validate(action) : WalletEditSchema.validate(action);
  return errors;
}

export function isValidAction(action: Action<any>) {
  // eslint-disable-next-line no-constant-condition
  // if (true) return true;
  let errors: any[];
  switch (action.type) {
    case EntityType.Admin:
      errors = isValidAdminAction(action);
      break;
    case EntityType.Forum:
      errors = isValidForumAction(action);
      break;
    case EntityType.Post:
      errors = isValidPostAction(action);
      break;
    case EntityType.Profile:
      errors = isValidProfileAction(action);
      break;
    case EntityType.Restriction:
      errors = isValidRestrictionAction(action);
      break;
    case EntityType.RestrictionRule:
      errors = isValidRestrictionRuleAction(action);
      break;
    case EntityType.Topic:
      errors = isValidTopicAction(action);
      break;
    case EntityType.User:
      errors = isValidUserAction(action);
      break;
    case EntityType.Vote:
      errors = isValidVoteAction(action);
      break;
    case EntityType.Wallet:
      errors = isValidWalletAction(action);
      break;
    default:
      errors = [];
  }
  return !errors.length;
}
