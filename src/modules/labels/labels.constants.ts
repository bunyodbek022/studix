import { Role } from '@prisma/client';
import type { LabelDefinition } from './labels.types';

const STAFF_ROLES = [Role.SUPERADMIN, Role.ADMIN, Role.CREATOR] as const;

const STAFF_AND_TEACHER_ROLES = [...STAFF_ROLES, Role.TEACHER] as const;

export const LABEL_DEFINITIONS = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    order: 1,
    roles: [...STAFF_AND_TEACHER_ROLES, Role.STUDENT],
  },
  {
    key: 'students',
    title: 'Students',
    path: '/students',
    order: 2,
    roles: STAFF_ROLES,
  },
  {
    key: 'teachers',
    title: 'Teachers',
    path: '/teachers',
    order: 3,
    roles: STAFF_ROLES,
  },
  {
    key: 'courses',
    title: 'Courses',
    path: '/courses',
    order: 4,
    roles: STAFF_ROLES,
  },
  {
    key: 'groups',
    title: 'Groups',
    path: '/groups',
    order: 5,
    roles: STAFF_AND_TEACHER_ROLES,
  },
  {
    key: 'lessons',
    title: 'Lessons',
    path: '/lessons',
    order: 6,
    roles: STAFF_AND_TEACHER_ROLES,
  },

  {
    key: 'payments',
    title: 'To\'lovlar',
    path: '/payments',
    order: 8,
    roles: [Role.STUDENT],
  },
  {
    key: 'profile',
    title: 'Ma\'lumotlarim',
    path: '/profile',
    order: 9,
    roles: [Role.STUDENT, ...STAFF_AND_TEACHER_ROLES],
  },
  {
    key: 'rating',
    title: 'Rating',
    path: '/rating',
    order: 10,
    roles: [Role.STUDENT],
  },
  {
    key: 'gifts',
    title: 'Gifts',
    path: '/gifts',
    order: 11,
    roles: [Role.STUDENT],
  },
  {
    key: 'leads',
    title: 'Leads',
    path: '/leads',
    order: 12,
    roles: STAFF_ROLES,
  },
  {
    key: 'finance',
    title: 'Finance',
    path: '/finance',
    order: 13,
    roles: STAFF_ROLES,
  },
  {
    key: 'management',
    title: 'Management',
    path: '/management',
    order: 14,
    roles: STAFF_ROLES,
  },

] as const satisfies readonly LabelDefinition[];
