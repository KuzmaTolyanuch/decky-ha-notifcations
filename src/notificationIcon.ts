import * as MaterialIcons from 'react-icons/md';

const ICON_LOOKUP = MaterialIcons as unknown as Record<string, unknown>;

const toPascalCase = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/^mdi[:_-]/i, '')
    .replace(/^mdi/i, '')
    .replace(/[-_\s]+(.)/g, (_, match: string) => match.toUpperCase())
    .replace(/^(.)/, (match: string) => match.toUpperCase());

  return cleaned || 'Home';
};

export const resolveNotificationIcon = (iconName?: string) => {
  if (!iconName || typeof iconName !== 'string') {
    return null;
  }

  const trimmed = iconName.trim();
  if (!trimmed) {
    return null;
  }

  const baseName = trimmed.replace(/^mdi[:_-]/i, '');
  const icon = ICON_LOOKUP[`Md${toPascalCase(baseName)}`];
  return icon ? icon as typeof MaterialIcons[keyof typeof MaterialIcons] : null;
};
