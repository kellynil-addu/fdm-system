'use client';

import { createContext, createElement, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  listUsers,
  registerUser,
  toggleUser as toggleUserAction,
  deleteUser as deleteUserAction,
  updateUserProfile as updateUserProfileAction,
} from '@/lib/actions/admin-user';
import type { UserListItem, RegisterUserParams } from '@/lib/actions/admin-user';
import { getActiveRoles, setUserRoles as setUserRolesAction } from '@/lib/actions/admin-roles';
import type { RbacRole } from '@/lib/actions/admin-roles';

export type AdminDialog =
  | { type: 'create' }
  | { type: 'edit-name'; user: UserListItem }
  | { type: 'edit-roles'; user: UserListItem }
  | { type: 'toggle'; user: UserListItem }
  | { type: 'delete'; user: UserListItem }
  | null;

interface AdminUsersContextValue {
  users: UserListItem[];
  roles: RbacRole[];
  isLoading: boolean;
  error: string | null;
  /** The signed-in admin, so the UI can disable actions against their own account. */
  currentUserId: string;
  selectedUserId: string | null;
  selectedUser: UserListItem | null;
  activeDialog: AdminDialog;
  selectUser: (id: string | null) => void;
  openDialog: (dialog: AdminDialog) => void;
  closeDialog: () => void;
  createUser: (params: RegisterUserParams) => Promise<void>;
  updateUserName: (userId: string, firstName: string, lastName: string) => Promise<void>;
  updateUserRoles: (userId: string, roleIds: string[]) => Promise<void>;
  toggleUserStatus: (userId: string, isBanned: boolean) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const AdminUsersContext = createContext<AdminUsersContextValue | null>(null);

export function useAdminUsers() {
  const ctx = useContext(AdminUsersContext);
  if (!ctx) throw new Error('useAdminUsers must be used within AdminUsersProvider');
  return ctx;
}

export function AdminUsersProvider({
  children,
  currentUserId,
}: {
  children: ReactNode;
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<AdminDialog>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  useEffect(() => {
    Promise.all([listUsers(), getActiveRoles()])
      .then(([usersResult, rolesResult]) => {
        if (!usersResult.success) throw new Error(usersResult.error);
        setUsers(usersResult.users);
        setRoles(rolesResult);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setIsLoading(false));
  }, []);

  function selectUser(id: string | null) {
    setSelectedUserId(id);
  }

  function openDialog(dialog: AdminDialog) {
    setActiveDialog(dialog);
  }

  function closeDialog() {
    setActiveDialog(null);
  }

  async function createUser(params: RegisterUserParams): Promise<void> {
    const result = await registerUser(params);
    if (!result.success) throw new Error(result.error);
    const newUser: UserListItem = {
      id: result.userId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      roles: roles
        .filter((r) => (params.roleIds ?? []).includes(r.id))
        .map(({ id, name }) => ({ id, name })),
      isBanned: false,
    };
    setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);
    router.refresh();
  }

  async function updateUserName(userId: string, firstName: string, lastName: string): Promise<void> {
    const result = await updateUserProfileAction(userId, firstName, lastName);
    if (!result.success) throw new Error(result.error);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, firstName, lastName } : u)));
    router.refresh();
  }

  async function updateUserRoles(userId: string, roleIds: string[]): Promise<void> {
    const result = await setUserRolesAction(userId, roleIds);
    if (!result.success) throw new Error(result.error);
    const updatedRoles = roles
      .filter((r) => roleIds.includes(r.id))
      .map(({ id, name }) => ({ id, name }));
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roles: updatedRoles } : u)));
    router.refresh();
  }

  async function toggleUserStatus(userId: string, isBanned: boolean): Promise<void> {
    const result = await toggleUserAction(userId, isBanned);
    if (!result.success) throw new Error(result.error);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isBanned: !isBanned } : u)));
    router.refresh();
  }

  async function deleteUser(userId: string): Promise<void> {
    const result = await deleteUserAction(userId);
    if (!result.success) throw new Error(result.error);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (selectedUserId === userId) setSelectedUserId(null);
    router.refresh();
  }

  const value: AdminUsersContextValue = {
    users,
    roles,
    isLoading,
    error,
    currentUserId,
    selectedUserId,
    selectedUser,
    activeDialog,
    selectUser,
    openDialog,
    closeDialog,
    createUser,
    updateUserName,
    updateUserRoles,
    toggleUserStatus,
    deleteUser,
  };

  return createElement(AdminUsersContext.Provider, { value }, children);
}
