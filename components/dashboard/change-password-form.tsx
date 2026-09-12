'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { LoadingButton } from '@/components/ui/loading-button';
import { changePassword, MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { useMutation } from '@/lib/hooks/use-mutation';
import { toast } from 'sonner';

export function ChangePasswordForm() {
  const { state, execute, reset } = useMutation(changePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isPending = state.status === 'pending';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await execute({ currentPassword, newPassword, confirmPassword });
    if (ok) {
      toast.success('Password updated. Use it the next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      reset();
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Change Password</CardTitle>
        <CardDescription>
          Enter your current password, then choose a new one of at least{' '}
          {MIN_PASSWORD_LENGTH} characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <FormField
            id="currentPassword"
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
          <FormField
            id="newPassword"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            disabled={isPending}
          />
          <FormField
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            disabled={isPending}
          />

          {state.status === 'error' && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <LoadingButton
              type="submit"
              isLoading={isPending}
              loadingText="Updating..."
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Update Password
            </LoadingButton>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
