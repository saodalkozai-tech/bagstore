import { User } from '@/types';

import {
  formatSupabaseError,
  getSupabaseClient,
  getStoreSettingsSafe,
} from './storage-core';

type ProfileRow = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: User['role'] | null;
  avatar?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeRole(value: unknown): User['role'] {
  if (value === 'admin' || value === 'editor' || value === 'viewer') {
    return value;
  }
  return 'viewer';
}

function toAppUser(profile: ProfileRow | null, authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User {
  const fallbackName =
    (typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name.trim()) ||
    (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
    authUser.email?.split('@')[0] ||
    'مستخدم';
  const fallbackUsername =
    (typeof authUser.user_metadata?.username === 'string' && authUser.user_metadata.username.trim()) ||
    authUser.email?.split('@')[0] ||
    authUser.id.slice(0, 8);

  return {
    id: authUser.id,
    name: profile?.name?.trim() || fallbackName,
    username: profile?.username?.trim() || fallbackUsername,
    email: profile?.email?.trim() || authUser.email || '',
    role: normalizeRole(profile?.role),
    avatar: profile?.avatar?.trim() || '',
    createdAt: profile?.created_at || new Date().toISOString(),
  };
}

async function ensureProfile(client: NonNullable<ReturnType<typeof getSupabaseClient>>, authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<ProfileRow | null> {
  const { data: existingProfile, error: selectError } = await client
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!selectError && existingProfile) {
    return existingProfile as ProfileRow;
  }

  const username =
    (typeof authUser.user_metadata?.username === 'string' && authUser.user_metadata.username.trim()) ||
    authUser.email?.split('@')[0] ||
    authUser.id.slice(0, 8);
  const name =
    (typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name.trim()) ||
    (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
    username;

  const payload = {
    id: authUser.id,
    name,
    username,
    email: authUser.email || '',
    role: 'viewer',
    avatar: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: insertedProfile, error: insertError } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (insertError) {
    if (import.meta.env.DEV) {
      console.warn('Supabase profile bootstrap skipped:', insertError);
    }
    return null;
  }

  return (insertedProfile as ProfileRow | null) || null;
}

export async function getSupabaseSessionUser(): Promise<User | null> {
  const client = getSupabaseClient(getStoreSettingsSafe());
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const profile = await ensureProfile(client, data.user);
  return toAppUser(profile, data.user);
}

export async function loginWithSupabase(email: string, password: string): Promise<User> {
  const client = getSupabaseClient(getStoreSettingsSafe());
  if (!client) {
    throw new Error('Supabase غير مفعّل في الإعدادات الحالية.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    throw formatSupabaseError(error || new Error('Auth failed'), 'تسجيل الدخول');
  }

  const profile = await ensureProfile(client, data.user);
  return toAppUser(profile, data.user);
}

export async function logoutFromSupabase(): Promise<void> {
  const client = getSupabaseClient(getStoreSettingsSafe());
  if (!client) return;
  await client.auth.signOut();
}

export async function listSupabaseUsers(): Promise<User[]> {
  const client = getSupabaseClient(getStoreSettingsSafe());
  if (!client) return [];

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw formatSupabaseError(error, 'المستخدمين');
  }

  return (data || []).map((row) =>
    toAppUser(row as ProfileRow, {
      id: String(row.id),
      email: typeof row.email === 'string' ? row.email : '',
      user_metadata: {},
    })
  );
}

export async function updateCurrentUserPasswordWithSupabase(
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const client = getSupabaseClient(getStoreSettingsSafe());
  if (!client) return false;

  const { data: currentData, error: currentError } = await client.auth.getUser();
  if (currentError || !currentData.user?.email) {
    return false;
  }

  const email = currentData.user.email;
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) {
    return false;
  }

  const { error: updateError } = await client.auth.updateUser({ password: newPassword });
  return !updateError;
}
