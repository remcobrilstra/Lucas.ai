import { Role } from "@/lib/types/roles";

/**
 * Permission definitions for each role
 */
export const PERMISSIONS: Record<string, readonly Role[]> = {
  // Settings & Configuration (Admin only)
  MANAGE_PROVIDERS: [Role.ADMIN],
  MANAGE_MODELS: [Role.ADMIN],
  MANAGE_ORG_SETTINGS: [Role.ADMIN],
  MANAGE_MEMBERS: [Role.ADMIN],
  VIEW_SETTINGS: [Role.ADMIN],

  // Agent Management
  CREATE_AGENTS: [Role.ADMIN, Role.DEVELOPER],
  EDIT_AGENTS: [Role.ADMIN, Role.DEVELOPER],
  DELETE_AGENTS: [Role.ADMIN, Role.DEVELOPER],
  VIEW_AGENTS: [Role.ADMIN, Role.DEVELOPER, Role.USER],

  // Data Sources
  CREATE_DATA_SOURCES: [Role.ADMIN, Role.DEVELOPER],
  EDIT_DATA_SOURCES: [Role.ADMIN, Role.DEVELOPER],
  DELETE_DATA_SOURCES: [Role.ADMIN, Role.DEVELOPER],
  VIEW_DATA_SOURCES: [Role.ADMIN, Role.DEVELOPER],

  // Tools
  CREATE_TOOLS: [Role.ADMIN, Role.DEVELOPER],
  EDIT_TOOLS: [Role.ADMIN, Role.DEVELOPER],
  DELETE_TOOLS: [Role.ADMIN, Role.DEVELOPER],
  VIEW_TOOLS: [Role.ADMIN, Role.DEVELOPER],

  // Playground (All roles)
  USE_PLAYGROUND: [Role.ADMIN, Role.DEVELOPER, Role.USER],

  // Agent Catalog (All roles)
  VIEW_CATALOG: [Role.ADMIN, Role.DEVELOPER, Role.USER],
  CHAT_WITH_AGENTS: [Role.ADMIN, Role.DEVELOPER, Role.USER],

  // Analytics
  VIEW_ANALYTICS: [Role.ADMIN, Role.DEVELOPER],
};

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/**
 * Check if a role can access settings
 */
export function canAccessSettings(role: Role): boolean {
  return hasPermission(role, "VIEW_SETTINGS");
}

/**
 * Check if a role can manage providers and models
 */
export function canManageProviders(role: Role): boolean {
  return hasPermission(role, "MANAGE_PROVIDERS");
}

/**
 * Check if a role can manage models
 */
export function canManageModels(role: Role): boolean {
  return hasPermission(role, "MANAGE_MODELS");
}

/**
 * Check if a role can create/edit agents
 */
export function canManageAgents(role: Role): boolean {
  return hasPermission(role, "CREATE_AGENTS");
}

/**
 * Check if a role can manage data sources
 */
export function canManageDataSources(role: Role): boolean {
  return hasPermission(role, "CREATE_DATA_SOURCES");
}

/**
 * Check if a role can manage tools
 */
export function canManageTools(role: Role): boolean {
  return hasPermission(role, "CREATE_TOOLS");
}

/**
 * Check if a role can use the playground
 */
export function canUsePlayground(role: Role): boolean {
  return hasPermission(role, "USE_PLAYGROUND");
}

/**
 * Check if a role can view analytics
 */
export function canViewAnalytics(role: Role): boolean {
  return hasPermission(role, "VIEW_ANALYTICS");
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => roles.includes(role))
    .map(([permission]) => permission as Permission);
}
