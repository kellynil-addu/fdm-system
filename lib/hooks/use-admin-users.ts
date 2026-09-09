'use client';

import { useState, useEffect } from 'react';
import { listUsers } from '@/lib/actions/admin-user';
import { getActiveRoles } from '@/lib/actions/admin-roles';
import type { UserListItem } from '@/lib/actions/admin-user';
import type { RbacRole } from '@/lib/actions/admin-roles';

export function useAdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function addUser(user: UserListItem) {
    setUsers((prev) => [user, ...prev.filter((u) => u.id !== user.id)]);
  }

  function updateUser(user: UserListItem) {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
  }

  function removeUser(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  return { users, roles, isLoading, error, addUser, updateUser, removeUser };
}

