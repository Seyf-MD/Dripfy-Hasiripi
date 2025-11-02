import {
  APPROVAL_STEP_TEMPLATES as JS_APPROVAL_TEMPLATES,
  ROLE_DEFINITIONS as JS_ROLE_DEFINITIONS,
  getApprovalTemplates as getApprovalTemplatesJs,
  getRoleDefinition as getRoleDefinitionJs,
  isRoleAtLeast as isRoleAtLeastJs,
  listRoles as listRolesJs,
  resolveInheritedRoles as resolveInheritedRolesJs,
} from './roleModel.js';

export type RoleKey = keyof typeof JS_ROLE_DEFINITIONS;

export interface RoleDefinition {
  id: RoleKey;
  label: string;
  description: string;
  inherits: RoleKey[];
  capabilities: string[];
  rank: number;
}

export type ApprovalFlowType = keyof typeof JS_APPROVAL_TEMPLATES;

export interface ApprovalStepTemplate {
  id: string;
  label: string;
  requiredRole: RoleKey;
  slaHours: number;
  escalatesTo: RoleKey | null;
  notifications: Array<'email' | 'push'>;
}

export const ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> = JS_ROLE_DEFINITIONS as Record<RoleKey, RoleDefinition>;

export const APPROVAL_STEP_TEMPLATES: Record<ApprovalFlowType, ApprovalStepTemplate[]> =
  JS_APPROVAL_TEMPLATES as Record<ApprovalFlowType, ApprovalStepTemplate[]>;

export function getRoleDefinition(role: RoleKey): RoleDefinition | null {
  return (getRoleDefinitionJs(role) as RoleDefinition | null) ?? null;
}

export function listRoles(): RoleDefinition[] {
  return listRolesJs() as RoleDefinition[];
}

export function getInheritedRoles(role: RoleKey): RoleKey[] {
  return resolveInheritedRolesJs(role) as RoleKey[];
}

export function isRoleAtLeast(subject: RoleKey, required: RoleKey): boolean {
  return isRoleAtLeastJs(subject, required);
}

export function getApprovalTemplates(flowType: ApprovalFlowType): ApprovalStepTemplate[] {
  return getApprovalTemplatesJs(flowType) as ApprovalStepTemplate[];
}
