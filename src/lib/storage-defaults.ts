import type { UserRole } from "@/types";

export type DemoCredential = {
  username: string;
  password: string;
  role: UserRole;
  name: string;
  email: string;
};

export const DEFAULT_THEME_PRIMARY = '#d95f1f';
export const DEFAULT_THEME_ACCENT = '#d95f1f';
export const DEFAULT_THEME_BACKGROUND = '#ffffff';
export const DEFAULT_THEME_FOREGROUND = '#1a1a1a';

export const DEFAULT_DEMO_CREDENTIALS: DemoCredential[] = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'سعود الخزاعي',
    email: 'admin@bagstore.com'
  },
  {
    username: 'editor',
    password: 'editor123',
    role: 'editor',
    name: 'سارة علي',
    email: 'editor@bagstore.com'
  },
  {
    username: 'viewer',
    password: 'viewer123',
    role: 'viewer',
    name: 'محمد كريم',
    email: 'viewer@bagstore.com'
  }
];
