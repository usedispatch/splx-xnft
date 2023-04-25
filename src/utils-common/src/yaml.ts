import { parse, stringify } from 'yaml';

import { Json } from './json';

export function jsonToYaml(json: Json): string {
  return stringify(json, { indentSeq: false });
}

export function yamlToJson(yaml: string): Json {
  return parse(yaml);
}
