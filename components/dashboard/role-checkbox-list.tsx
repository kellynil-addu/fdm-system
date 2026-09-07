import type { RbacRole } from '@/lib/actions/admin-roles';

interface RoleCheckboxListProps {
  roles: RbacRole[];
  selectedIds: string[];
  onChange: (id: string, checked: boolean) => void;
  disabled?: boolean;
}

export function RoleCheckboxList({ roles, selectedIds, onChange, disabled }: RoleCheckboxListProps) {
  if (roles.length === 0) {
    return <p className="text-sm text-[#6C7E8E]">No roles available</p>;
  }

  return (
    <>
      {roles.map((role) => (
        <label
          key={role.id}
          className="flex items-start gap-3 p-3 bg-[#F5F3EC] rounded-lg border border-[#E2E7EC] hover:border-[#5BC4E7] hover:bg-[#E2F4FA] cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(role.id)}
            onChange={(e) => onChange(role.id, e.target.checked)}
            disabled={disabled}
            className="mt-0.5 w-4 h-4 rounded border-[#E2E7EC] text-[#5BC4E7] cursor-pointer"
          />
          <div className="flex-1">
            <p className="font-medium text-sm text-[#1A1D20]">{role.name}</p>
            {role.description && (
              <p className="text-xs text-[#6C7E8E] mt-0.5">{role.description}</p>
            )}
          </div>
        </label>
      ))}
    </>
  );
}

