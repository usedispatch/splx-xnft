export function binaryInsert(
  a: any[],
  item: any,
  getValue: Function = (item: number): number => item,
  replace: boolean = false
) {
  let min: number = 0;
  let max: number = a.length - 1;
  let mid: number;
  let midValue;
  const itemValue = getValue(item);
  while (min <= max) {
    mid = Math.floor((max + min) / 2);
    midValue = getValue(a[mid]);
    if (midValue <= itemValue) {
      min = mid + 1; // search higher
    }
    if (midValue > itemValue) {
      max = mid - 1; // search lower
    }
  }
  // If min === 0, then shouldn't replace!
  const shouldReplace = replace && min && getValue(a[min - 1]) === itemValue;
  a.splice(shouldReplace ? min - 1 : min, shouldReplace ? 1 : 0, item);
}

export function findClosestAfter(a: any[], item: any, getValue: Function = (item: number): number => item) {
  let min: number = 0;
  let max: number = a.length - 1;
  let mid: number;
  let midValue;
  const itemValue = getValue(item);
  while (min <= max) {
    mid = Math.floor((max + min) / 2);
    midValue = getValue(a[mid]);
    if (midValue < itemValue) {
      min = mid + 1; // search higher
    }
    if (midValue >= itemValue) {
      max = mid - 1; // search lower
    }
  }
  return min === a.length || min === 0 || getValue(a[min]) >= itemValue ? min - 1 : min;
}

export function findClosestBefore(a: any[], item: any, getValue: Function = (item: number): number => item) {
  let min: number = 0;
  let max: number = a.length - 1;
  let mid: number;
  let midValue;
  const itemValue = getValue(item);
  while (min <= max) {
    mid = Math.floor((max + min) / 2);
    midValue = getValue(a[mid]);
    if (midValue <= itemValue) {
      min = mid + 1; // search higher
    }
    if (midValue > itemValue) {
      max = mid - 1; // search lower
    }
  }
  return min === a.length || min === 0 || getValue(a[min]) >= itemValue ? min - 1 : min;
}

export function sortItemsAscending(items: any[], getValue: Function = (item: number): number => item) {
  items.sort((a, b) => {
    if (typeof a === 'undefined' || a === null || typeof b === 'undefined' || b === null) return -1;
    return getValue(a) - getValue(b);
  });
}

export function findClosestRange(
  a: any[],
  items: any[],
  getValue: Function = (item: number): number => item
): { start: number; end: number } {
  sortItemsAscending(items, getValue);
  const start = findClosestAfter(a, items[0], getValue) + 1;
  const end = findClosestBefore(a, items[items.length - 1], getValue) + 1;
  return { start, end };
}

export function randomize(arr: any[]): any[] {
  const copy = [...arr];
  const result: any[] = [];
  while (copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}
