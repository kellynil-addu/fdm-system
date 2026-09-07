'use client';

import { useState, useEffect } from 'react';
import { registerUser, listUsers } from '@/lib/actions/admin-user';
import { getActiveRoles } from '@/lib/actions/admin-roles';
import type { UserListItem } from '@/lib/actions/admin-user';
import type { RbacRole } from '@/lib/actions/admin-roles';

interface UseCreateUserOptions {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (user: UserListItem) => void;
}

export function useCreateUser({ isOpen, onClose, onUserCreated }: UseCreateUserOptions) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getActiveRoles()
      .then((r) => setRoles(r || []))
      .catch(() => setError('Failed to load roles'));
  }, [isOpen]);

  function handleRoleChange(id: string, checked: boolean) {
    setSelectedRoles((prev) => checked ? [...prev, id] : prev.filter((r) => r !== id));
  }

  function resetForm() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setSelectedRoles([]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!firstName.trim() || !lastName.trim()) throw new Error('First name and last name are required');
      if (!email || !password) throw new Error('Email and password are required');
      if (selectedRoles.length === 0) throw new Error('Please select at least one role');

      const result = await registerUser({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roleIds: selectedRoles,
      });

      if (!result?.success) throw new Error(result?.error || 'Failed to create user');

      try {
        const listResult = await listUsers();
        if (listResult.success) {
          const created = listResult.users.find((u) => u.id === result.userId);
          if (created && typeof onUserCreated === 'function') onUserCreated(created);
        }
      } catch {
        // Non-fatal: parent list refresh failed
      }

      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  }

  return {
    fields: { firstName, lastName, email, password },
    setters: { setFirstName, setLastName, setEmail, setPassword },
    roles,
    selectedRoles,
    handleRoleChange,
    isLoading,
    error,
    handleSubmit,
  };
}
