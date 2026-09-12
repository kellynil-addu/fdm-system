'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { RoleCheckboxList } from '@/components/dashboard/role-checkbox-list';
import { Plus, Settings2, Trash2, X, MoreHorizontal, Search, ListFilter, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { CreateUserModal } from './create-user-modal';
import { AdminUsersProvider, useAdminUsers, type StatusFilter } from '@/lib/hooks/use-admin-users';
import { useMutation } from '@/lib/hooks/use-mutation';
import type { UserListItem } from '@/lib/actions/admin-user';
import { roleLabel } from '@/lib/role-labels';
import { SELF_DEMOTE_ERROR, SYSTEM_ADMIN_ROLE } from '@/lib/self-protection';
import { toast } from 'sonner';

const TINTS = {
  activeBadge: 'bg-[color-mix(in_srgb,var(--success)_15%,white)]',
  activateBtnHover: 'hover:bg-[color-mix(in_srgb,var(--success)_85%,black)] hover:border-[color-mix(in_srgb,var(--success)_85%,black)]',
  deleteBtnHover: 'hover:bg-[color-mix(in_srgb,var(--destructive)_15%,white)] hover:border-[color-mix(in_srgb,var(--destructive)_30%,white)]',
  // --muted is a light surface token, so it works directly in both themes —
  // a color-mix against white would only have been correct in light mode.
  rowHover: 'hover:bg-muted',
  actionBtnHover: 'hover:bg-muted',
  primaryBtnHover: 'hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)]',
  destructiveBtnHover: 'hover:bg-[color-mix(in_srgb,var(--destructive)_85%,black)]',
};

function RoleBadges({ roles }: { roles: UserListItem['roles'] }) {
  if (roles.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <Badge
          key={role.id}
          variant="secondary"
          className="bg-sidebar-accent text-sidebar-accent-foreground border-transparent hover:bg-sidebar-accent"
        >
          {roleLabel(role.name)}
        </Badge>
      ))}
    </div>
  );
}

function ToggleUserDialog({ user }: { user: UserListItem }) {
  const { toggleUserStatus, closeDialog } = useAdminUsers();
  const { state, execute } = useMutation(toggleUserStatus);

  useEffect(() => {
    if (state.status === 'success') {
      closeDialog();
      toast.success(user.isBanned ? 'User activated successfully' : 'User deactivated successfully');
    }
  }, [state.status, closeDialog, user.isBanned]);

  return (
    <AlertDialog open onOpenChange={(v) => !v && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user.isBanned ? 'Activate user?' : 'Deactivate user?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user.isBanned
              ? <><span>This will restore access for </span><strong>{user.email}</strong><span>. They will be able to log in immediately.</span></>
              : <><span>This will block access for </span><strong>{user.email}</strong><span>. They will be unable to log in until reactivated.</span></>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === 'error' && <p className="text-sm text-destructive -mt-2">{state.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={state.status === 'pending'}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={state.status === 'pending'}
            onClick={() => execute(user.id, user.isBanned)}
            className={user.isBanned ? `bg-primary ${TINTS.primaryBtnHover} text-primary-foreground` : `bg-destructive ${TINTS.destructiveBtnHover} text-white`}
          >
            {state.status === 'pending' ? 'Saving...' : user.isBanned ? 'Activate' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteUserDialog({ user }: { user: UserListItem }) {
  const { deleteUser, closeDialog } = useAdminUsers();
  const { state, execute } = useMutation(deleteUser);

  useEffect(() => {
    if (state.status === 'success') {
      closeDialog();
      toast.success('User deleted successfully');
    }
  }, [state.status, closeDialog]);

  return (
    <AlertDialog open onOpenChange={(v) => !v && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{user.email}</strong> from the system. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === 'error' && <p className="text-sm text-destructive -mt-2">{state.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={state.status === 'pending'}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={state.status === 'pending'}
            onClick={() => execute(user.id)}
            className={`bg-destructive ${TINTS.destructiveBtnHover} text-white`}
          >
            {state.status === 'pending' ? 'Deleting...' : 'Delete User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UserRow({ user }: { user: UserListItem }) {
  const { selectedUserId, selectUser, openDialog, currentUserId } = useAdminUsers();
  const isSelected = selectedUserId === user.id;
  const isSelf = user.id === currentUserId;

  return (
    <TableRow
      className={`group cursor-pointer transition-colors ${isSelected ? 'bg-sidebar-accent' : TINTS.rowHover}`}
      onClick={() => selectUser(isSelected ? null : user.id)}
    >
      <TableCell className="font-medium text-foreground">
        <div className="flex items-center gap-2">
          <span>{user.email}</span>
          {isSelf && (
            <Badge
              variant="outline"
              className="bg-card border-border text-muted-foreground font-normal hover:bg-card"
            >
              You
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell><RoleBadges roles={user.roles} /></TableCell>
      <TableCell>
        <div className="flex items-center justify-between gap-2">
          <div>
            {user.isBanned ? (
              <Badge variant="destructive" className="border-transparent">Inactive</Badge>
            ) : (
              <Badge className={`${TINTS.activeBadge} text-success border-transparent`}>Active</Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Open user actions"
                className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md ${TINTS.actionBtnHover}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem
                disabled={isSelf && !user.isBanned}
                onSelect={(e) => { e.preventDefault(); openDialog({ type: 'toggle', user }); }}
              >
                {user.isBanned ? 'Activate user' : 'Deactivate user'}
              </DropdownMenuItem>
              {isSelf && !user.isBanned && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  You cannot deactivate your own account.
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EditRolesDialog({ user }: { user: UserListItem }) {
  const { roles, updateUserRoles, closeDialog, currentUserId } = useAdminUsers();
  const { state, execute } = useMutation(updateUserRoles);
  const initialRoleIds = user.roles.map((r) => r.id);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialRoleIds);

  // An admin editing their own roles must keep system_admin, otherwise they
  // lose access to this page and cannot undo the change.
  const isSelf = user.id === currentUserId;
  const ownSystemAdminRoleId = isSelf
    ? roles.find((r) => r.name === SYSTEM_ADMIN_ROLE && initialRoleIds.includes(r.id))?.id
    : undefined;
  const lockedIds = ownSystemAdminRoleId ? [ownSystemAdminRoleId] : [];

  useEffect(() => {
    if (state.status === 'success') {
      closeDialog();
      toast.success('Roles updated successfully');
    }
  }, [state.status, closeDialog]);

  const isDirty =
    selectedRoleIds.length !== initialRoleIds.length ||
    selectedRoleIds.some((id) => !initialRoleIds.includes(id));

  function handleRoleChange(roleId: string, checked: boolean) {
    setSelectedRoleIds((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  }

  return (
    <Dialog open onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Roles</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground break-all -mt-1">{user.email}</p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          <RoleCheckboxList
            roles={roles}
            selectedIds={selectedRoleIds}
            onChange={handleRoleChange}
            disabled={state.status === 'pending'}
            lockedIds={lockedIds}
            lockedHint={SELF_DEMOTE_ERROR}
          />
        </div>
        {state.status === 'error' && <p className="text-xs text-destructive">{state.error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={state.status === 'pending'}>
            Cancel
          </Button>
          <LoadingButton
            isLoading={state.status === 'pending'}
            disabled={!isDirty}
            onClick={() => execute(user.id, selectedRoleIds)}
            className={`bg-primary text-primary-foreground ${TINTS.primaryBtnHover}`}
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNameDialog({ user }: { user: UserListItem }) {
  const { updateUserName, closeDialog } = useAdminUsers();
  const { state, execute } = useMutation(updateUserName);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === 'success') {
      closeDialog();
      toast.success('Name updated successfully');
    }
  }, [state.status, closeDialog]);

  const isDirty = firstName !== (user.firstName || '') || lastName !== (user.lastName || '');

  function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setValidationError('First name and last name are required');
      return;
    }
    setValidationError(null);
    execute(user.id, firstName.trim(), lastName.trim());
  }

  const displayError = validationError || (state.status === 'error' ? state.error : null);

  return (
    <Dialog open onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Name</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground break-all -mt-1">{user.email}</p>
        <div className="space-y-4">
          <FormField
            id="edit-firstName"
            label="First Name"
            labelClassName="text-xs text-muted-foreground"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter first name"
          />
          <FormField
            id="edit-lastName"
            label="Last Name"
            labelClassName="text-xs text-muted-foreground"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter last name"
          />
          {displayError && <p className="text-xs text-destructive">{displayError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={state.status === 'pending'}>
            Cancel
          </Button>
          <LoadingButton
            isLoading={state.status === 'pending'}
            disabled={!isDirty || !firstName.trim() || !lastName.trim()}
            onClick={handleSave}
            className={`bg-primary text-primary-foreground ${TINTS.primaryBtnHover}`}
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailPane() {
  const { selectedUser, selectUser, openDialog, currentUserId } = useAdminUsers();

  if (!selectedUser) return null;

  const isSelf = selectedUser.id === currentUserId;

  return (
    <div className="flex flex-col w-72 shrink-0 border-l border-border">
      <CardHeader className="flex-row items-center justify-between space-y-0 py-4 border-b border-border">
        <CardTitle className="text-sm text-foreground">User Details</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => selectUser(null)} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Email</p>
          <p className="text-sm text-foreground break-all">{selectedUser.email}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">First Name</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDialog({ type: 'edit-name', user: selectedUser })}
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-sidebar-accent"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <p className="text-sm text-foreground">{selectedUser.firstName || '—'}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Last Name</p>
          <p className="text-sm text-foreground">{selectedUser.lastName || '—'}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Roles</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDialog({ type: 'edit-roles', user: selectedUser })}
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-sidebar-accent"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <RoleBadges roles={selectedUser.roles} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</p>
          <Button
            size="sm"
            variant={selectedUser.isBanned ? 'outline' : 'destructive'}
            disabled={isSelf && !selectedUser.isBanned}
            onClick={() => openDialog({ type: 'toggle', user: selectedUser })}
            className={selectedUser.isBanned ? `w-full bg-success border-success text-success-foreground ${TINTS.activateBtnHover}` : 'w-full'}
          >
            {selectedUser.isBanned ? 'Activate User' : 'Deactivate User'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isSelf}
            onClick={() => openDialog({ type: 'delete', user: selectedUser })}
            className={`w-full bg-card border-border text-foreground ${TINTS.deleteBtnHover}`}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete User
          </Button>
          {isSelf && (
            <p className="text-xs text-muted-foreground">
              This is your own account. Ask another system administrator to
              deactivate or delete it.
            </p>
          )}
        </div>
      </CardContent>
    </div>
  );
}

/** Search box plus role and status filters. */
function UserFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  roleFilter: string | null;
  onRoleFilterChange: (v: string | null) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
}) {
  const { roles } = useAdminUsers();
  const activeRole = roles.find((r) => r.id === roleFilter);
  const filterCount = (roleFilter ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, email or role"
          aria-label="Search users"
          className="pl-8 w-full sm:w-64"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ListFilter className="h-4 w-4" />
            Filter
            {filterCount > 0 && (
              <Badge className="bg-primary text-primary-foreground border-transparent px-1.5">
                {filterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Status
          </p>
          {statusOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onSelect={(e) => { e.preventDefault(); onStatusFilterChange(opt.value); }}
              className="justify-between"
            >
              {opt.label}
              {statusFilter === opt.value && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}

          <p className="px-2 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Role
          </p>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); onRoleFilterChange(null); }}
            className="justify-between"
          >
            All roles
            {roleFilter === null && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
          {roles.map((role) => (
            <DropdownMenuItem
              key={role.id}
              onSelect={(e) => { e.preventDefault(); onRoleFilterChange(role.id); }}
              className="justify-between"
            >
              {roleLabel(role.name)}
              {roleFilter === role.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {filterCount > 0 && (
        <Button
          variant="ghost"
          onClick={() => { onRoleFilterChange(null); onStatusFilterChange('all'); }}
          className="text-muted-foreground gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Clear
          {activeRole && <span className="sr-only">{roleLabel(activeRole.name)}</span>}
        </Button>
      )}
    </div>
  );
}

function UserManagementContent() {
  const {
    users,
    visibleUsers,
    isLoading,
    error,
    selectedUser,
    activeDialog,
    openDialog,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
  } = useAdminUsers();

  if (isLoading) {
    return (
      <Card className="flex flex-col flex-1 overflow-hidden bg-card border-border items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col flex-1 overflow-hidden bg-card border-border items-center justify-center min-h-[300px]">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  const isFiltered = search.trim() !== '' || roleFilter !== null || statusFilter !== 'all';

  return (
    <>
      <Card className="flex flex-col flex-1 overflow-hidden bg-card border-border">
        <CardHeader className="space-y-4 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">User Management</CardTitle>
              <CardDescription className="mt-1">
                Create and manage system users with role-based access control
              </CardDescription>
            </div>
            <Button
              onClick={() => openDialog({ type: 'create' })}
              className={`bg-primary text-primary-foreground ${TINTS.primaryBtnHover} rounded-lg flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Create User
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <UserFilters
              search={search}
              onSearchChange={setSearch}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {isFiltered
                ? `${visibleUsers.length} of ${users.length} user${users.length === 1 ? '' : 's'}`
                : `${users.length} user${users.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-w-0">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-card border-t border-border">
                  <TableHead className="text-muted-foreground font-semibold">Email</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Roles</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      {isFiltered
                        ? 'No users match the current search and filters.'
                        : 'No users found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleUsers.map((user) => <UserRow key={user.id} user={user} />)
                )}
              </TableBody>
            </Table>
          </div>

          {selectedUser && <UserDetailPane />}
        </CardContent>
      </Card>

      {activeDialog?.type === 'create' && <CreateUserModal />}
      {activeDialog?.type === 'edit-name' && <EditNameDialog user={activeDialog.user} />}
      {activeDialog?.type === 'edit-roles' && <EditRolesDialog user={activeDialog.user} />}
      {activeDialog?.type === 'toggle' && <ToggleUserDialog user={activeDialog.user} />}
      {activeDialog?.type === 'delete' && <DeleteUserDialog user={activeDialog.user} />}
    </>
  );
}

export function UserManagementSection({ currentUserId }: { currentUserId: string }) {
  return (
    <AdminUsersProvider currentUserId={currentUserId}>
      <UserManagementContent />
    </AdminUsersProvider>
  );
}
