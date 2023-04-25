import {
  EntityType,
  IdDelim,
  ParsedId,
  ParsedPostboxId,
  entityTypeToHex,
  getPostboxOrderPrefix,
  hexToEntityType,
  parseId,
} from './entities';
import { hexToNum, numToHex } from '@dispatch-services/utils-common/string';

export interface ParsedDepthOrder {
  parsedId: ParsedId;
  type: EntityType;
  depth: number;
}

// Note(Partyman): Later, when allowing infinite depth, will need to check if EntityType is Action and pass in the parent's depth order
// to continue on from there.
export function packDepthOrder(entityId: string) {
  // Parse the id.
  const parsedId = parseId(entityId) as ParsedPostboxId[];
  // Get the shardId (topic || forum)
  const parentId = getPostboxOrderPrefix(parsedId);
  // The depth (0 if forum).
  const depth = parsedId.length - 1;
  const type = parsedId[depth].type;
  // pack it together -> ${parentId}+${num2hex(entity, 16)}-${num2hex(depth, 16)}
  return `${parentId}${IdDelim.Link}${entityTypeToHex(type)}${IdDelim.Link}${numToHex(depth, 16)}`;
}

export function parseDepthOrder(depthOrder: string): ParsedDepthOrder {
  const [id, hexType, hexDepth] = depthOrder.split(IdDelim.Link);
  return {
    parsedId: parseId(id),
    type: hexToEntityType(hexType),
    depth: hexToNum(hexDepth),
  };
}

export function getDepthFromId(entityId: string) {
  // Parse the id.
  const parsedId = parseId(entityId) as ParsedPostboxId[];
  return parsedId.length - 1;
}
