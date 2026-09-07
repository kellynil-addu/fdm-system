'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { LoadingButton } from '@/components/ui/loading-button';
import { RoleCheckboxList } from '@/components/dashboard/role-checkbox-list';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useCreateUser } from '@/lib/hooks/use-create-user';
import type { UserListItem } from '@/lib/actions/admin-user';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (user: UserListItem) => void;
}

export function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const { fields, setters, roles, selectedRoles, handleRoleChange, isLoading, error, handleSubmit } =
    useCreateUser({ isOpen, onClose, onUserCreated });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
      <Card style={{ backgroundColor: '#ffffff', color: '#1A1D20' }} className="w-full max-w-md bg-white text-[#1A1D20] border-[#E2E7EC] rounded-2xl shadow-lg">
        <div className="p-6 border-b border-[#E2E7EC] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1A1D20]">Create New User</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F3EC] rounded-lg transition-colors" disabled={isLoading}>
            <X className="w-5 h-5 text-[#6C7E8E]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="firstName"
              label="First Name"
              type="text"
              value={fields.firstName}
              onChange={(e) => setters.setFirstName(e.target.value)}
              placeholder="Juan"
              required
              disabled={isLoading}
            />
            <FormField
              id="lastName"
              label="Last Name"
              type="text"
              value={fields.lastName}
              onChange={(e) => setters.setLastName(e.target.value)}
              placeholder="Dela Cruz"
              required
              disabled={isLoading}
            />
          </div>

          <FormField
            id="email"
            label="Email Address"
            type="email"
            value={fields.email}
            onChange={(e) => setters.setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            disabled={isLoading}
          />

          <FormField
            id="password"
            label="Temporary Password"
            type="password"
            value={fields.password}
            onChange={(e) => setters.setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            hint="User can change this after first login"
          />

          <div className="space-y-3">
            <Label className="text-[#1A1D20] font-medium text-sm">Assign Roles</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <RoleCheckboxList
                roles={roles}
                selectedIds={selectedRoles}
                onChange={handleRoleChange}
                disabled={isLoading}
              />
            </div>
            {selectedRoles.length === 0 && (
              <p className="text-xs text-[#6C7E8E]">Select at least one role.</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-white border-[#E2E7EC] text-[#1A1D20] hover:bg-[#F5F3EC] rounded-lg"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Creating..."
              disabled={selectedRoles.length === 0}
              className="flex-1 bg-[#5BC4E7] text-white hover:bg-[#4AADE0] rounded-lg"
            >
              Create User
            </LoadingButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
