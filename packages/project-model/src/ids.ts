const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export function isComponentId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function componentId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
