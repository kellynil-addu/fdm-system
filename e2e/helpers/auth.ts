import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;

export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'tester@example.com';
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'tester123!';

export async function loginAsUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.locator('#email')).toBeVisible();
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 30000 });
}

export async function loginAsAdmin(page: Page) {
  await loginAsUser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function createE2EUser(roleNames: string[] = []) {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const email = `e2e-user-${timestamp}-${rand}@example.com`;
  const password = `Pass-${timestamp}!`;

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'E2E', last_name: 'Tester' },
  });

  if (createError || !userData?.user) {
    throw new Error(`Failed to create E2E user: ${createError?.message}`);
  }

  const userId = userData.user.id;

  if (roleNames.length > 0) {
    const { data: roles } = await adminClient
      .schema('rbac')
      .from('role')
      .select('id, name')
      .in('name', roleNames);

    if (roles && roles.length > 0) {
      await adminClient
        .schema('rbac')
        .from('user_role')
        .insert(roles.map((r) => ({ user_id: userId, role_id: r.id })));
    }
  }

  return {
    email,
    password,
    cleanup: async () => {
      await adminClient.auth.admin.deleteUser(userId);
    },
  };
}
