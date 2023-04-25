import { ActionCrud, Crud } from './actions/types';
import { EntityType, entityTypeToHex, hexToEntityType } from './entities/types';
import { hexToNum, numToHex } from '@dispatch-services/utils-common/string';

export function packActionOrder(type: EntityType, crud: Crud) {
  return `${entityTypeToHex(type)}${numToHex(crud, 8)}`;
}

export function parseActionOrder(actionOrder: string): ActionCrud {
  const crudHex = actionOrder.slice(-2);
  const typeHex = actionOrder.slice(0, -2);
  return {
    type: hexToEntityType(typeHex),
    crud: hexToNum(crudHex),
  };
}
