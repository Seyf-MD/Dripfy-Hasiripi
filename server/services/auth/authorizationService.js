import { getRoleDefinition, isRoleAtLeast, normaliseRole, resolveInheritedRoles } from '../../models/roleModel.js';

export function getAuthorisationProfile(role) {
  const normalised = normaliseRole(role);
  const definition = getRoleDefinition(normalised);
  if (!definition) {
    return {
      role: normalised,
      inherits: [],
      capabilities: [],
      rank: -1,
    };
  }
  return {
    role: definition.id,
    inherits: resolveInheritedRoles(definition.id),
    capabilities: Array.isArray(definition.capabilities) ? [...definition.capabilities] : [],
    rank: typeof definition.rank === 'number' ? definition.rank : -1,
  };
}

export function userHasRequiredRole(userRole, requiredRole) {
  if (!requiredRole) {
    return true;
  }
  return isRoleAtLeast(normaliseRole(userRole), requiredRole);
}

export function assertRole(userRole, requiredRole) {
  if (!userHasRequiredRole(userRole, requiredRole)) {
    const error = new Error('Insufficient permissions');
    error.code = 'INSUFFICIENT_ROLE';
    throw error;
  }
}

export function describeRole(role) {
  const definition = getRoleDefinition(normaliseRole(role));
  if (!definition) {
    return null;
  }
  return {
    id: definition.id,
    label: definition.label,
    inherits: resolveInheritedRoles(definition.id),
  };
}
