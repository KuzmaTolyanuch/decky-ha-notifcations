import * as mdiIcons from '@mdi/js';

const ICON_LOOKUP = mdiIcons as unknown as Record<string, string>;

/** Resolve a Home Assistant icon string such as `mdi:map-marker-question-outline`. */
export const resolveNotificationIcon = (iconName?: string): string | null => {
  if (!iconName || typeof iconName !== 'string') {
    return null;
  }

  const match = /^mdi:([a-z0-9]+(?:-[a-z0-9]+)*)$/i.exec(iconName.trim());
  if (!match) {
    return null;
  }

  const exportName = `mdi${match[1]
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;

  return ICON_LOOKUP[exportName] ?? null;
};
