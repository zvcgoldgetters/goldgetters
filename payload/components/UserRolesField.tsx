'use client';

import type { JSONFieldClientComponent, OptionObject } from 'payload';
import { SelectInput, useAuth, useField } from '@payloadcms/ui';
import { type ComponentProps, useCallback, useMemo } from 'react';
import { hasRole, isUserRole, userRoleOptions } from '../access/roles';

type SelectOnChange = NonNullable<
  ComponentProps<typeof SelectInput>['onChange']
>;
type FieldValidate = NonNullable<
  NonNullable<Parameters<typeof useField<unknown>>[0]>['validate']
>;

function normalizeRoleValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function extractSelectedRoles(
  selectedOption: Parameters<SelectOnChange>[0],
): string[] {
  if (Array.isArray(selectedOption)) {
    return selectedOption
      .map((option) => option.value)
      .filter((entry): entry is string => typeof entry === 'string');
  }

  if (
    typeof selectedOption === 'object' &&
    'value' in selectedOption &&
    typeof selectedOption.value === 'string'
  ) {
    return [selectedOption.value];
  }

  return [];
}

/**
 * Renders `Users.roles` as a multi-select input in Payload Admin while keeping
 * single-column atomic JSON storage in SQLite.
 */
export const UserRolesField: JSONFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly,
}) => {
  const { user } = useAuth();
  const canAssignAdminRole = hasRole(user, 'administrator');

  const memoizedValidate = useCallback<FieldValidate>(
    (nextValue: unknown) => {
      if (readOnly) {
        return true;
      }

      const normalized = normalizeRoleValues(nextValue);
      if (normalized.length === 0) {
        return 'At least one valid role is required.';
      }

      return normalized.every(isUserRole) &&
        new Set(normalized).size === normalized.length
        ? true
        : 'Roles must be unique valid role values.';
    },
    [readOnly],
  );

  const {
    customComponents: {
      AfterInput,
      BeforeInput,
      Description,
      Error: ErrorComponent,
      Label,
    } = {},
    disabled,
    path,
    setValue,
    showError,
    value,
  } = useField<unknown>({
    potentiallyStalePath: pathFromProps,
    validate: memoizedValidate,
  });

  const selectedValues = useMemo(() => normalizeRoleValues(value), [value]);
  const isReadOnly = readOnly === true || disabled;

  const options = useMemo<OptionObject[]>(() => {
    const includesAdministrator = selectedValues.includes('administrator');
    const visibleRoles =
      isReadOnly || canAssignAdminRole || includesAdministrator
        ? userRoleOptions
        : userRoleOptions.filter((option) => option.value !== 'administrator');

    return visibleRoles.map((option) => ({
      label: option.label,
      value: option.value,
    }));
  }, [canAssignAdminRole, isReadOnly, selectedValues]);

  const handleChange: SelectOnChange = useCallback(
    (selectedOption) => {
      if (isReadOnly) {
        return;
      }

      setValue(extractSelectedRoles(selectedOption));
    },
    [isReadOnly, setValue],
  );

  return (
    <SelectInput
      AfterInput={AfterInput}
      BeforeInput={BeforeInput}
      className={field.admin?.className}
      Description={Description}
      description={field.admin?.description}
      Error={ErrorComponent}
      hasMany
      isClearable={false}
      isSortable
      Label={Label}
      label={field.label}
      localized={field.localized}
      name={field.name}
      onChange={handleChange}
      options={options}
      path={path}
      readOnly={isReadOnly}
      required={field.required}
      showError={showError}
      value={selectedValues}
    />
  );
};
