'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormField } from '@/components/ui/form-field';
import { RoleCheckboxList } from '@/components/dashboard/role-checkbox-list';
import { Plus, Settings2, Trash2, X } from 'lucide-react';
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
import { MoreHorizontal } from 'lucide-react';
import { CreateUserModal } from './create-user-modal';
import { toggleUser, deleteUser, updateUserProfile } from '@/lib/actions/admin-user';
import type { UserListItem } from '@/lib/actions/admin-user';
import { setUserRoles } from '@/lib/actions/admin-roles';
import type { RbacRole } from '@/lib/actions/admin-roles';
import { useAdminUsers } from '@/lib/hooks/use-admin-users';
import { toast } from 'sonner';

function RoleBadges({ roles }: { roles: UserListItem['roles'] }) {
  if (roles.length === 0) return <span className="text-[#6C7E8E]">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <Badge
          key={role.id}
          variant="secondary"
          className="bg-[#E2F4FA] text-[#3AAFE0] border-transparent hover:bg-[#E2F4FA]"
        >
          {role.name}
        </Badge>
      ))}
    </div>
  );
}

function ToggleUserDialog({ user, open, onOpenChange, onToggle }: { user: UserListItem; open: boolean; onOpenChange: (v: boolean) => void; onToggle?: () => void }) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);

  async function handleConfirm() {
    setIsToggling(true);
    await toggleUser(user.id, user.isBanned);
    setIsToggling(false);
    onOpenChange(false);
    onToggle?.();
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isToggling}
            onClick={handleConfirm}
            className={user.isBanned ? 'bg-[#5BC4E7] hover:bg-[#4AADE0] text-white' : 'bg-destructive hover:bg-destructive/90 text-white'}
          >
            {isToggling ? 'Saving...' : user.isBanned ? 'Activate' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteUserDialog({ user, open, onOpenChange, onDeleted }: { user: UserListItem; open: boolean; onOpenChange: (v: boolean) => void; onDeleted?: () => void }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    const result = await deleteUser(user.id);
    setIsDeleting(false);
    if (result.success) {
      onOpenChange(false);
      onDeleted?.();
      router.refresh();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{user.email}</strong> from the system. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UserRow({ user, isSelected, onClick, onUserUpdated }: { user: UserListItem; isSelected: boolean; onClick: () => void; onUserUpdated?: (updatedUser: UserListItem) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleToggle() {
    onUserUpdated?.({ ...user, isBanned: !user.isBanned });
  }

  return (
    <>
      <TableRow
        className={`group cursor-pointer transition-colors ${isSelected ? 'bg-[#F0F9FD]' : 'hover:bg-[#F9FAFB]'}`}
        onClick={onClick}
      >
        <TableCell className="font-medium text-[#1A1D20]">{user.email}</TableCell>
        <TableCell><RoleBadges roles={user.roles} /></TableCell>
        <TableCell>
          <div className="flex items-center justify-between gap-2">
            <div>
              {user.isBanned ? (
                <Badge variant="destructive" className="border-transparent">Inactive</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-transparent hover:bg-green-100">Active</Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Open user actions"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-[#F3F4F6]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 text-[#6C7E8E]" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                >
                  {user.isBanned ? 'Activate user' : 'Deactivate user'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      <ToggleUserDialog user={user} open={confirmOpen} onOpenChange={setConfirmOpen} onToggle={handleToggle} />
    </>
  );
}

function EditRolesDialog({ user, open, onOpenChange, allRoles, onRolesUpdated }: { user: UserListItem; open: boolean; onOpenChange: (v: boolean) => void; allRoles: RbacRole[]; onRolesUpdated?: (updatedRoles: UserListItem['roles']) => void }) {
  const router = useRouter();
  const initialRoleIds = user.roles.map((r) => r.id);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialRoleIds);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedRoleIds(user.roles.map((r) => r.id));
  }, [open, user.id]);

  const isDirty =
    selectedRoleIds.length !== initialRoleIds.length ||
    selectedRoleIds.some((id) => !initialRoleIds.includes(id));

  function handleRoleChange(roleId: string, checked: boolean) {
    setSelectedRoleIds((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  }

  async function handleSave() {
    setIsPending(true);
    await setUserRoles(user.id, selectedRoleIds);
    setIsPending(false);
    const updatedRoles = allRoles.filter((role) => selectedRoleIds.includes(role.id));
    onRolesUpdated?.(updatedRoles);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Roles</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#6C7E8E] break-all -mt-1">{user.email}</p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          <RoleCheckboxList
            roles={allRoles}
            selectedIds={selectedRoleIds}
            onChange={handleRoleChange}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            isLoading={isPending}
            disabled={!isDirty}
            onClick={handleSave}
            className="bg-[#5BC4E7] text-white hover:bg-[#4AADE0]"
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNameDialog({ user, open, onOpenChange, onNamesUpdated }: { user: UserListItem; open: boolean; onOpenChange: (v: boolean) => void; onNamesUpdated?: (firstName: string, lastName: string) => void }) {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setError(null);
  }, [open, user.id, user.firstName, user.lastName]);

  const isDirty = firstName !== (user.firstName || '') || lastName !== (user.lastName || '');

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await updateUserProfile(user.id, firstName.trim(), lastName.trim());
    setIsPending(false);

    if (result.success) {
      onNamesUpdated?.(firstName.trim(), lastName.trim());
      onOpenChange(false);
    } else {
      setError(result.error || 'Failed to update names');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Name</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#6C7E8E] break-all -mt-1">{user.email}</p>
        <div className="space-y-4">
          <FormField
            id="edit-firstName"
            label="First Name"
            labelClassName="text-xs text-[#6C7E8E]"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter first name"
          />
          <FormField
            id="edit-lastName"
            label="Last Name"
            labelClassName="text-xs text-[#6C7E8E]"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter last name"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            isLoading={isPending}
            disabled={!isDirty || !firstName.trim() || !lastName.trim()}
            onClick={handleSave}
            className="bg-[#5BC4E7] text-white hover:bg-[#4AADE0]"
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailPane({ user, roles, onClose, onUserUpdated, onUserDeleted }: { user: UserListItem; roles: RbacRole[]; onClose: () => void; onUserUpdated?: (updatedUser: UserListItem) => void; onUserDeleted?: () => void }) {
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col w-72 shrink-0 border-l border-[#E2E7EC]">
      <CardHeader className="flex-row items-center justify-between space-y-0 py-4 border-b border-[#E2E7EC]">
        <CardTitle className="text-sm text-[#1A1D20]">User Details</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="text-xs text-[#6C7E8E] font-medium uppercase tracking-wide mb-1">Email</p>
          <p className="text-sm text-[#1A1D20] break-all">{user.email}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6C7E8E] font-medium uppercase tracking-wide">First Name</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditNameOpen(true)}
              className="h-6 px-2 text-xs text-[#5BC4E7] hover:text-[#3AAFE0] hover:bg-[#E2F4FA]"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <p className="text-sm text-[#1A1D20]">{user.firstName || '—'}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#6C7E8E] font-medium uppercase tracking-wide">Last Name</p>
          <p className="text-sm text-[#1A1D20]">{user.lastName || '—'}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6C7E8E] font-medium uppercase tracking-wide">Roles</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditRolesOpen(true)}
              className="h-6 px-2 text-xs text-[#5BC4E7] hover:text-[#3AAFE0] hover:bg-[#E2F4FA]"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <RoleBadges roles={user.roles} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#6C7E8E] font-medium uppercase tracking-wide">Status</p>
          <Button
            size="sm"
            variant={user.isBanned ? 'outline' : 'destructive'}
            onClick={() => setToggleOpen(true)}
            className={user.isBanned ? 'w-full bg-[#22C55E] border-[#22C55E] text-white hover:bg-[#16A34A] hover:border-[#16A34A]' : 'w-full'}
          >
            {user.isBanned ? 'Activate User' : 'Deactivate User'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="w-full bg-white border-[#E2E7EC] text-[#1A1D20] hover:bg-[#FEE2E2] hover:text-[#991B1B] hover:border-[#FCA5A5]"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete User
          </Button>
        </div>
      </CardContent>

      <EditNameDialog user={user} open={editNameOpen} onOpenChange={setEditNameOpen} onNamesUpdated={(fn, ln) => onUserUpdated?.({ ...user, firstName: fn, lastName: ln })} />
      <EditRolesDialog user={user} open={editRolesOpen} onOpenChange={setEditRolesOpen} allRoles={roles} onRolesUpdated={(updatedRoles) => onUserUpdated?.({ ...user, roles: updatedRoles })} />
      <ToggleUserDialog user={user} open={toggleOpen} onOpenChange={setToggleOpen} onToggle={() => onUserUpdated?.({ ...user, isBanned: !user.isBanned })} />
      <DeleteUserDialog user={user} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={onUserDeleted} />
    </div>
  );
}

export function UserManagementSection() {
  const { users, roles, isLoading, error, addUser, updateUser, removeUser } = useAdminUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  function handleRowClick(user: UserListItem) {
    setSelectedUser((prev) => (prev?.id === user.id ? null : user));
  }

  function handleUpdateUser(updatedUser: UserListItem) {
    updateUser(updatedUser);
    if (selectedUser?.id === updatedUser.id) setSelectedUser(updatedUser);
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col flex-1 overflow-hidden bg-white border-[#E2E7EC] items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E2E7EC] border-t-[#5BC4E7]" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col flex-1 overflow-hidden bg-white border-[#E2E7EC] items-center justify-center min-h-[300px]">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex flex-col flex-1 overflow-hidden bg-white border-[#E2E7EC]">
        <CardHeader className="flex-row items-center justify-between space-y-0 shrink-0">
          <div>
            <CardTitle className="text-xl text-[#1A1D20]">User Management</CardTitle>
            <CardDescription className="mt-1">
              Create and manage system users with role-based access control
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#5BC4E7] text-white hover:bg-[#4AADE0] rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-w-0">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-white border-t border-[#E2E7EC]">
                  <TableHead className="text-[#6C7E8E] font-semibold">Email</TableHead>
                  <TableHead className="text-[#6C7E8E] font-semibold">Roles</TableHead>
                  <TableHead className="text-[#6C7E8E] font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-[#6C7E8E]">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => handleRowClick(user)}
                      onUserUpdated={handleUpdateUser}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {selectedUser && (
            <UserDetailPane
              user={selectedUser}
              roles={roles}
              onClose={() => setSelectedUser(null)}
              onUserUpdated={handleUpdateUser}
              onUserDeleted={() => {
                removeUser(selectedUser.id);
                setSelectedUser(null);
              }}
            />
          )}
        </CardContent>
      </Card>

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roles={roles}
        onUserCreated={(u) => {
          addUser(u);
          toast.success('User created successfully!');
        }}
      />
    </>
  );
}
