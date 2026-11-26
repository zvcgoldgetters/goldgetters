import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRole } from '../access/roles';
import { UserRolesCell } from './UserRolesCell';
import { UserRolesField } from './UserRolesField';

type MockSelectInputProps = {
  hasMany?: boolean;
  isClearable?: boolean;
  onChange?: (option: { label: string; value: string }[]) => void;
  options?: { label: string; value: string }[];
  readOnly?: boolean;
  value?: string[];
};

const mockUseField = vi.fn();
const mockUseAuth = vi.fn();
const mockSelectInput = vi.fn((props: MockSelectInputProps) => (
  <div
    data-has-many={String(props.hasMany)}
    data-options={props.options?.map((option) => option.value).join(',')}
    data-read-only={String(props.readOnly)}
    data-testid="mock-select-input"
    data-value={props.value?.join(',')}
  />
));

vi.mock('@payloadcms/ui', () => ({
  SelectInput: (props: MockSelectInputProps) => mockSelectInput(props),
  useAuth: (): unknown => mockUseAuth(),
  useField: (options: unknown): unknown => mockUseField(options),
}));

const allRoleCount = 6;
const nonAdminRoleCount = 5;

describe('UserRolesField', () => {
  const setValue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, roles: ['administrator'] satisfies UserRole[] },
    });
    mockUseField.mockReturnValue({
      customComponents: {},
      disabled: false,
      path: 'roles',
      setValue,
      showError: false,
      value: ['member', 'editor'],
    });
  });

  it('renders a multi-select input with all role options for administrators', () => {
    render(
      <UserRolesField
        field={{ name: 'roles', label: 'Roles', required: true }}
        path="roles"
      />,
    );

    const passedProps = mockSelectInput.mock.calls[0][0];
    expect(passedProps.hasMany).toBe(true);
    expect(passedProps.isClearable).toBe(false);
    expect(passedProps.readOnly).toBe(false);
    expect(passedProps.value).toEqual(['member', 'editor']);
    expect(passedProps.options).toHaveLength(allRoleCount);

    passedProps.onChange?.([
      { label: 'Member', value: 'member' },
      { label: 'Treasurer', value: 'treasurer' },
    ]);
    expect(setValue).toHaveBeenCalledWith(['member', 'treasurer']);
  });

  it('hides the administrator option for non-admin creators unless already assigned', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, roles: ['director'] satisfies UserRole[] },
    });

    const { rerender } = render(
      <UserRolesField
        field={{ name: 'roles', label: 'Roles', required: true }}
        path="roles"
      />,
    );

    const creatorProps = mockSelectInput.mock.calls[0][0];
    expect(creatorProps.options).toHaveLength(nonAdminRoleCount);
    expect(
      creatorProps.options?.some((option) => option.value === 'administrator'),
    ).toBe(false);

    mockUseField.mockReturnValue({
      customComponents: {},
      disabled: false,
      path: 'roles',
      setValue,
      showError: false,
      value: ['administrator', 'member'],
    });
    rerender(
      <UserRolesField
        field={{ name: 'roles', label: 'Roles', required: true }}
        path="roles"
      />,
    );

    const existingAdminProps = mockSelectInput.mock.calls[1][0];
    expect(existingAdminProps.options).toHaveLength(allRoleCount);
  });

  it('does not update values when read-only', () => {
    render(
      <UserRolesField
        field={{ name: 'roles', label: 'Roles', required: true }}
        path="roles"
        readOnly
      />,
    );

    const passedProps = mockSelectInput.mock.calls[0][0];
    expect(passedProps.readOnly).toBe(true);
    passedProps.onChange?.([{ label: 'Member', value: 'member' }]);
    expect(setValue).not.toHaveBeenCalled();
  });
});

describe('UserRolesCell', () => {
  it('formats role arrays as comma-separated labels', () => {
    render(
      <UserRolesCell
        cellData={['administrator', 'member']}
        collectionSlug="users"
        field={{ name: 'roles', type: 'json' }}
        rowData={{ id: 1 }}
      />,
    );

    expect(screen.getByText('Administrator, Member')).toBeTruthy();
  });
});
