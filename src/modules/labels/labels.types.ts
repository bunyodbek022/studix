import { Role } from '@prisma/client';

export type LabelKey =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'groups'
  | 'lessons'
  | 'rooms';

export type LabelTitle =
  | 'Dashboard'
  | 'Students'
  | 'Teachers'
  | 'Courses'
  | 'Groups'
  | 'Lessons'
  | 'Rooms';

export interface LabelDefinition {
  key: LabelKey;
  title: LabelTitle;
  path: `/${string}`;
  order: number;
  roles: readonly Role[];
}

export interface LabelItem {
  key: LabelKey;
  title: LabelTitle;
  path: `/${string}`;
  order: number;
}

export interface LabelsMeta {
  role: Role;
  total: number;
}

export interface LabelsResponse {
  success: true;
  data: LabelItem[];
  meta: LabelsMeta;
}

export interface LabelNamesResponse {
  success: true;
  data: LabelTitle[];
  meta: LabelsMeta;
}
