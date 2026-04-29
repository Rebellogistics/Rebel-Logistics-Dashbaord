import { Profile, UserRole } from '@/lib/types';
import { useProfile } from '@/hooks/useProfile';

export type Permission =
  | 'view_revenue'
  | 'view_settings'
  | 'edit_team'
  | 'edit_trucks'
  | 'edit_sms_templates'
  | 'edit_customers'
  | 'edit_pricing'
  | 'send_sms'
  | 'edit_jobs'
  | 'see_audit_log';

const ROLE_PERMS: Record<UserRole, Set<Permission>> = {
  owner: new Set<Permission>([
    'view_revenue',
    'view_settings',
    'edit_team',
    'edit_trucks',
    'edit_sms_templates',
    'edit_customers',
    'edit_pricing',
    'send_sms',
    'edit_jobs',
    'see_audit_log',
  ]),
  admin: new Set<Permission>([
    'view_revenue',
    'view_settings',
    'edit_team',
    'edit_trucks',
    'edit_sms_templates',
    'edit_customers',
    'edit_pricing',
    'send_sms',
    'edit_jobs',
    'see_audit_log',
  ]),
  dispatcher: new Set<Permission>([
    // Dispatchers can run ops but can't see money or change settings
    'edit_customers',
    'send_sms',
    'edit_jobs',
  ]),
  driver: new Set<Permission>([
    // Drivers only act on their own jobs through the driver shell
  ]),
  pending: new Set<Permission>([]),
};

export function can(profile: Profile | null | undefined, permission: Permission): boolean {
  if (!profile || !profile.active) return false;
  return ROLE_PERMS[profile.role]?.has(permission) ?? false;
}

export function useCan(permission: Permission): boolean {
  const { data: profile } = useProfile();
  return can(profile, permission);
}

/** Convenience: get a snapshot of every perm for the current user. */
export function useAllPerms(): Record<Permission, boolean> {
  const { data: profile } = useProfile();
  const result = {} as Record<Permission, boolean>;
  for (const perm of Object.keys(ROLE_PERMS.owner) as Permission[]) {
    result[perm] = can(profile, perm);
  }
  // Make sure every permission is represented
  for (const perm of [
    'view_revenue',
    'view_settings',
    'edit_team',
    'edit_trucks',
    'edit_sms_templates',
    'edit_customers',
    'edit_pricing',
    'send_sms',
    'edit_jobs',
    'see_audit_log',
  ] as Permission[]) {
    if (result[perm] === undefined) result[perm] = can(profile, perm);
  }
  return result;
}
