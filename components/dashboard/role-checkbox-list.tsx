import type { RbacRole } from '@/lib/actions/admin-roles';

interface RoleCheckboxListProps {
  roles: RbacRole[];
  selectedIds: string[];
  onChange: (id: string, checked: boolean) => void;
  disabled?: boolean;
}

export function RoleCheckboxList({ roles, selectedIds, onChange, disabled }: RoleCheckboxListProps) {
  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground">No roles available</p>;
  }

  return (
    <>
      {roles.map((role) => (
        <label
          key={role.id}
          className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary hover:bg-sidebar-accent cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(role.id)}
            onChange={(e) => onChange(role.id, e.target.checked)}
            disabled={disabled}
            className="mt-0.5 w-4 h-4 rounded border-border text-primary cursor-pointer"
          />
          <div className="flex-1">
            <p className="font-medium text-sm text-foreground">{role.name}</p>
            {role.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
            )}
          </div>
        </label>
      ))}
    </>
  );
}

