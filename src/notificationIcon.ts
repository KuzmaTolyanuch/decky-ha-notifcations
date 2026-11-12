import * as MaterialIcons from 'react-icons/md';
import * as MaterialDesignIcons from 'react-icons/mi';

const ICON_LOOKUP = {
  ...MaterialIcons,
  ...MaterialDesignIcons,
} as Record<string, unknown>;

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
  const candidates = [
    `Md${toPascalCase(baseName)}`,
    `Mi${toPascalCase(baseName)}`,
  ];

  for (const candidate of candidates) {
    const icon = ICON_LOOKUP[candidate];
    if (icon) {
      return icon as typeof MaterialIcons[keyof typeof MaterialIcons];
    }
  }

  return null;
};
