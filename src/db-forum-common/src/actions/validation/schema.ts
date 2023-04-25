import { ChainId, chainIdToName } from '@dispatch-services/db-forum-common/chains';
import { EntityType, getTypeFromId } from '@dispatch-services/db-forum-common/entities';
import Schema, { SchemaDefinition, ValidationFunction } from 'validate';
import { get as getJsonValue, merge } from '@dispatch-services/utils-common/json';

import { Crud } from '../types';
import { PublicKey } from '@solana/web3.js';

const EntityArray = [
  EntityType.Admin,
  EntityType.Forum,
  EntityType.Post,
  EntityType.Profile,
  EntityType.ProductTopic,
  EntityType.Restriction,
  EntityType.RestrictionRule,
  EntityType.Topic,
  EntityType.User,
  EntityType.Vote,
  EntityType.Wallet,
];

const CrudArray = [Crud.Post, Crud.Put, Crud.Delete];
const uint32 = Math.pow(2, 32) - 1;

function notEmpty(schema, value, ctx, path) {
  if (getJsonValue(schema, path) === undefined) {
    path = path.split('.').slice(1).join('.');
  }

  return !getJsonValue(schema, path).required || !!value?.trim();
}
const isCrud: ValidationFunction = (val: number) => CrudArray.includes(val);
const isEntity: ValidationFunction = (val: number) => EntityArray.includes(val);
const positive: ValidationFunction = (val: number) => val >= 0 && val <= uint32;
const isVoteValid: ValidationFunction = (val: Number) => val === -1 || val === 1;
const isValidChainId: ValidationFunction = (val: number) => !!chainIdToName(val);
function isValidId(entityTypes, value, ctx, path) {
  return getTypeFromId(value) !== EntityType.Unknown;
}
const isValidAddress: ValidationFunction = (val: number, ctx: any) => {
  switch (ctx.params?.chainId) {
    case ChainId.SolanaMain:
    case ChainId.SolanaDev:
    case ChainId.SolanaLocal: {
      return isValidSolanaAddress(val);
    }
    default: {
      return false;
    }
  }
};

function isValidSolanaAddress(value) {
  try {
    return !!new PublicKey(value);
  } catch (e) {
    return false;
  }
}

const BaseActionDef: SchemaDefinition = {
  parentId: {
    type: String,
    required: false,
    use: { notEmpty: (val, ctx, path) => notEmpty(BaseActionDef, val, ctx, path) },
  },
};

const ActionCrudDef: SchemaDefinition = {
  crud: {
    type: Number,
    required: true,
    use: { isCrud },
  },
  type: {
    type: Number,
    required: true,
    use: { isEntity },
  },
  crudEntityId: {
    type: String,
    required: false,
    use: {
      notEmpty: (val, ctx, path) => notEmpty(ActionCrudDef, val, ctx, path),
    },
  },
};

const ActionCrudEditDef: SchemaDefinition = merge({}, ActionCrudDef, {
  crudEntityId: {
    required: true,
    use: { isValidId: (val, ctx, path) => isValidId([EntityType.Action], val, ctx, path) },
  },
});

const AdminDef: SchemaDefinition = {
  parentId: {
    required: true,
    use: { isValidId: (val, ctx, path) => isValidId([EntityType.User], val, ctx, path) },
  },
  entityId: {
    type: String,
    required: true,
    use: {
      notEmpty: (val, ctx, path) => notEmpty(AdminSchemaDef, val, ctx, path),
      isValidId: (val, ctx, path) => isValidId([EntityType.Admin], val, ctx, path),
    },
  },
};

const AdminSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudDef, {
  params: AdminDef,
});

// ParentId constraint defined by PostboxEntityType
const PostboxDef: SchemaDefinition = {
  body: {
    type: String,
    required: false,
    use: { notEmpty: (val, ctx, path) => notEmpty(PostboxDef, val, ctx, path) },
  },
  title: {
    type: String,
    required: false,
    use: { notEmpty: (val, ctx, path) => notEmpty(PostboxDef, val, ctx, path) },
  },
};

// TODO: Specify parentId validId for each Postbox type
const PostboxEditDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudEditDef, {
  parentId: { required: true },
  params: PostboxDef,
});

const ForumSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudDef, {
  parentId: { required: false },
  params: PostboxDef,
});

const ForumEditSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudEditDef, ForumSchemaDef);

const PostSchemaDef: SchemaDefinition = merge(
  {
    parentId: {
      required: true,
      use: {
        isValidId: (val, ctx, path) =>
          isValidId([EntityType.Forum, EntityType.Topic, EntityType.Post, EntityType.ProductTopic], val, ctx, path),
      },
    },
  },
  BaseActionDef,
  ActionCrudDef,
  PostboxDef
);
const PostEditSchemaDef: SchemaDefinition = merge({}, PostboxEditDef);

const ProfileDef: SchemaDefinition = {
  parentId: {
    required: true,
    use: { isValidId: (val, ctx, path) => isValidId([EntityType.User], val, ctx, path) },
  },
  name: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  twitter: {
    type: String,
    required: false,
  },
};

const ProfileSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudDef, {
  params: ProfileDef,
});

const ProfileEditSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudEditDef, {
  params: ProfileDef,
});

const RestrictionRuleDef: SchemaDefinition = {
  parentId: { required: true },
  address: {
    type: String,
    required: true,
    use: { notEmpty: (val, ctx, path) => notEmpty(RestrictionRuleDef, val, ctx, path), isValidAddress },
  },
  amount: {
    type: Number,
    required: true,
    use: { positive },
  },
  description: {
    type: Number,
    required: true,
    use: { notEmpty: (val, ctx, path) => notEmpty(RestrictionRuleDef, val, ctx, path) },
  },
};

const RestrictionRuleEditDef: SchemaDefinition = merge({}, RestrictionRuleDef, {
  address: { required: false },
  amount: { required: false },
  description: { required: false },
});

const RestrictionRuleSchemaDef = merge({}, BaseActionDef, ActionCrudDef, {
  params: RestrictionRuleDef,
});

const RestrictionRuleEditSchemaDef = merge({}, BaseActionDef, ActionCrudEditDef, {
  params: RestrictionRuleEditDef,
});

const RestrictionDef: SchemaDefinition = {
  parentId: { required: true },
  query: {
    type: String,
    required: true,
    use: { notEmpty: (val, ctx, path) => notEmpty(RestrictionDef, val, ctx, path) },
  },
};

const RestrictionEditDef: SchemaDefinition = merge({}, RestrictionDef, {
  query: { required: false },
});

const RestrictionSchemaDef = merge({}, BaseActionDef, ActionCrudDef, {
  params: RestrictionDef,
});

const RestrictionEditSchemaDef = merge({}, BaseActionDef, ActionCrudEditDef, {
  params: RestrictionEditDef,
});

const TopicSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudDef, PostboxDef);
const TopicEditSchemaDef: SchemaDefinition = merge({}, PostboxEditDef);

const UserDef: SchemaDefinition = {
  did: {
    type: String,
    required: true,
    use: { notEmpty: (val, ctx, path) => notEmpty(UserDef, val, ctx, path) },
  },
};

const UserEditDef: SchemaDefinition = merge({}, UserDef, {
  did: { required: false },
});

const UserSchemaDef: SchemaDefinition = merge({}, ActionCrudDef, {
  params: UserDef,
});
const UserEditSchemaDef: SchemaDefinition = merge({}, ActionCrudEditDef, {
  params: UserEditDef,
});

const VoteDef: SchemaDefinition = {
  value: {
    type: Number,
    required: true,
    use: { isVoteValid },
  },
};

const VoteEditDef: SchemaDefinition = {
  value: {
    required: false,
  },
};

const VoteSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudDef, PostboxDef, {
  params: VoteDef,
});
const VoteEditSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudEditDef, PostboxEditDef, {
  params: VoteEditDef,
});

// Constraining wallet parents to just users for now
const WalletDef: SchemaDefinition = {
  parentId: {
    required: true,
    use: { isValidId: (val, ctx, path) => isValidId([EntityType.User], val, ctx, path) },
  },
  address: {
    type: String,
    required: true,
    use: {
      notEmpty: (val, ctx, path) => notEmpty(WalletDef, val, ctx, path),
      isValidAddress,
    },
  },
  chainId: {
    type: Number,
    required: true,
    use: { isValidChainId },
  },
};

const WalletEditDef: SchemaDefinition = merge({}, WalletDef, {
  address: { required: false },
});

const WalletSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudDef, {
  params: WalletDef,
});
const WalletEditSchemaDef: SchemaDefinition = merge({}, BaseActionDef, ActionCrudEditDef, {
  params: WalletEditDef,
});

// Now export the schemas.
// TODO(Partyman): Maybe break out into individual rules if there's a lot of repeats?
// TODO(Partyman): Check if address is valid instead of just not empty.
// TODO(Partyman): Sanitize the inputs as well.

const opts = { strip: false };
export const AdminSchema = new Schema(AdminSchemaDef, opts);
export const AdminEditSchema = new Schema(AdminSchemaDef, opts);

export const ForumSchema = new Schema(ForumSchemaDef, opts);
export const ForumEditSchema = new Schema(ForumEditSchemaDef, opts);

export const PostSchema = new Schema(PostSchemaDef, opts);
export const PostEditSchema = new Schema(PostEditSchemaDef, opts);

export const ProfileSchema = new Schema(ProfileSchemaDef, opts);
export const ProfileEditSchema = new Schema(ProfileEditSchemaDef, opts);

export const RestrictionSchema = new Schema(RestrictionSchemaDef, opts);
export const RestrictionEditSchema = new Schema(RestrictionEditSchemaDef, opts);

export const RestrictionRuleSchema = new Schema(RestrictionRuleSchemaDef, opts);
export const RestrictionRuleEditSchema = new Schema(RestrictionRuleEditSchemaDef, opts);

export const TopicSchema = new Schema(TopicSchemaDef, opts);
export const TopicEditSchema = new Schema(TopicEditSchemaDef, opts);

export const UserSchema = new Schema(UserSchemaDef, opts);
export const UserEditSchema = new Schema(UserEditSchemaDef, opts);

export const VoteSchema = new Schema(VoteSchemaDef, opts);
export const VoteEditSchema = new Schema(VoteEditSchemaDef, opts);

export const WalletSchema = new Schema(WalletSchemaDef, opts);
export const WalletEditSchema = new Schema(WalletEditSchemaDef, opts);
