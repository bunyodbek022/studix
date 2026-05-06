import { Role } from '@prisma/client';
import type { LabelDefinition } from './labels.types';

const STAFF_ROLES = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.MANAGEMENT,
  Role.ADMINISTRATOR,
] as const;

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
    key: 'rooms',
    title: 'Rooms',
    path: '/rooms',
    order: 7,
    roles: STAFF_ROLES,
  },
] as const satisfies readonly LabelDefinition[];
