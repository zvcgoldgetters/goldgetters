import type { DefaultCellComponentProps, JSONFieldClient } from 'payload';
import { userRoleOptions } from '../access/roles';

const roleLabels = new Map<string, string>(
  userRoleOptions.map((option) => [option.value, option.label]),
);

/**
 * Formats a `Users.roles` JSON array into human-readable labels for Admin list columns.
 */
export function UserRolesCell({
  cellData,
}: DefaultCellComponentProps<JSONFieldClient, unknown>) {
  if (!Array.isArray(cellData)) {
    return null;
  }

  const labels = cellData
    .filter((entry): entry is string => typeof entry === 'string')
    .map((role) => roleLabels.get(role) ?? role);

  return <span>{labels.join(', ')}</span>;
}
