/**
 * Role Constants for Street Support API Platform
 * 
 * This file defines all predefined roles and role-related utilities.
 * These constants should be used throughout the API instead of hardcoded strings.
 */

// ============================================================================
// BASE ROLES
// ============================================================================

/**
 * Base role types (without location/org specific suffixes)
 */
export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  CITY_ADMIN: 'CityAdmin',
  VOLUNTEER_ADMIN: 'VolunteerAdmin',
  ORG_ADMIN: 'OrgAdmin',
  SWEP_ADMIN: 'SwepAdmin',
} as const;

/**
 * Role prefixes for location/org-specific roles
 */
export const ROLE_PREFIXES = {
  CITY_ADMIN_FOR: 'CityAdminFor:',
  ADMIN_FOR: 'AdminFor:',
  SWEP_ADMIN_FOR: 'SwepAdminFor:',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Base role type (without location/org suffixes)
 */
export type BaseRole = typeof ROLES[keyof typeof ROLES];

/**
 * All possible role types including location/org-specific roles
 * Examples: 'SuperAdmin', 'CityAdminFor:birmingham', 'AdminFor:org-slug'
 */
export type Role = BaseRole | `${typeof ROLE_PREFIXES.CITY_ADMIN_FOR}${string}` | `${typeof ROLE_PREFIXES.ADMIN_FOR}${string}` | `${typeof ROLE_PREFIXES.SWEP_ADMIN_FOR}${string}`;

/**
 * Array of base roles for validation
 */
export const BASE_ROLES_ARRAY: readonly BaseRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.CITY_ADMIN,
  ROLES.VOLUNTEER_ADMIN,
  ROLES.ORG_ADMIN,
  ROLES.SWEP_ADMIN,
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role is a base role (without location/org suffix)
 */
export function isBaseRole(role: string): role is BaseRole {
  return BASE_ROLES_ARRAY.includes(role as BaseRole);
}

/**
 * Check if a role is a location-specific role (CityAdminFor:* or SwepAdminFor:*)
 */
export function isLocationSpecificRole(role: string): boolean {
  return role.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR) || role.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR);
}

/**
 * Check if a role is an org-specific role (AdminFor:*)
 */
export function isOrgSpecificRole(role: string): boolean {
  return role.startsWith(ROLE_PREFIXES.ADMIN_FOR);
}

// TODO: remove it if we don't need it
/**
 * Extract the location/org slug from a specific role
 * @example extractRoleSlug('CityAdminFor:birmingham') => 'birmingham'
 */
// export function extractRoleSlug(role: string): string | null {
//   if (isLocationSpecificRole(role)) {
//     if (role.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)) {
//       return role.substring(ROLE_PREFIXES.CITY_ADMIN_FOR.length);
//     }
//     if (role.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR)) {
//       return role.substring(ROLE_PREFIXES.SWEP_ADMIN_FOR.length);
//     }
//   }
//   if (isOrgSpecificRole(role)) {
//     return role.substring(ROLE_PREFIXES.ADMIN_FOR.length);
//   }
//   return null;
// }

/**
 * Create a location-specific city admin role
 * @example createCityAdminRole('birmingham') => 'CityAdminFor:birmingham'
 */
export function createCityAdminRole(locationSlug: string): string {
  return `${ROLE_PREFIXES.CITY_ADMIN_FOR}${locationSlug}`;
}

/**
 * Create a location-specific SWEP admin role
 * @example createSwepAdminRole('birmingham') => 'SwepAdminFor:birmingham'
 */
export function createSwepAdminRole(locationSlug: string): string {
  return `${ROLE_PREFIXES.SWEP_ADMIN_FOR}${locationSlug}`;
}

// TODO: remove it if we don't need it
/**
 * Create an org-specific admin role
 * @example createOrgAdminRole('org-slug') => 'AdminFor:org-slug'
 */
// export function createOrgAdminRole(orgSlug: string): string {
//   return `${ROLE_PREFIXES.ADMIN_FOR}${orgSlug}`;
// }

/**
 * Validate if a role string matches the expected format
 */
export function isValidRole(role: string): boolean {
  // Check if it's a base role
  if (isBaseRole(role)) {
    return true;
  }
  
  // Check if it's a valid location/org-specific role
  const rolePatterns = [
    new RegExp(`^${ROLE_PREFIXES.CITY_ADMIN_FOR}.+$`),
    new RegExp(`^${ROLE_PREFIXES.SWEP_ADMIN_FOR}.+$`),
    new RegExp(`^${ROLE_PREFIXES.ADMIN_FOR}.+$`),
  ];
  
  return rolePatterns.some(pattern => pattern.test(role));
}

// TODO: remove it if we don't need it
/**
 * Get all roles from a user's auth claims (base roles only)
 */
// export function getBaseRoles(authClaims: string[]): BaseRole[] {
//   return authClaims.filter(isBaseRole);
// }

// TODO: remove it if we don't need it
/**
 * Get all location-specific roles from auth claims
 */
export function getLocationSpecificRoles(authClaims: string[]): string[] {
  return authClaims.filter(isLocationSpecificRole);
}

// TODO: remove it if we don't need it
/**
 * Get all org-specific roles from auth claims
 */
// export function getOrgSpecificRoles(authClaims: string[]): string[] {
//   return authClaims.filter(isOrgSpecificRole);
// }

/**
 * Check if user has a specific base role
 */
export function hasRole(authClaims: string[], role: BaseRole): boolean {
  return authClaims.includes(role);
}

/**
 * Check if user has SuperAdmin role
 */
export function isSuperAdmin(authClaims: string[]): boolean {
  return hasRole(authClaims, ROLES.SUPER_ADMIN);
}

/**
 * Check if user has access to a specific location
 */
export function hasLocationAccess(authClaims: string[], locationSlug: string): boolean {
  // SuperAdmin has access to all locations
  if (isSuperAdmin(authClaims)) {
    return true;
  }
  
  // Check for general CityAdmin role
  if (hasRole(authClaims, ROLES.CITY_ADMIN)) {
    return true;
  }
  
  // Check for location-specific roles
  const cityAdminRole = createCityAdminRole(locationSlug);
  const swepAdminRole = createSwepAdminRole(locationSlug);
  
  return authClaims.includes(cityAdminRole) || authClaims.includes(swepAdminRole);
}


// TODO: remove it if we don't need it
/**
 * Check if user has access to a specific organisation
 */
// export function hasOrgAccess(authClaims: string[], orgSlug: string): boolean {
//   // SuperAdmin has access to all organisations
//   if (isSuperAdmin(authClaims)) {
//     return true;
//   }
  
//   // Check for general OrgAdmin role
//   if (hasRole(authClaims, ROLES.ORG_ADMIN)) {
//     return true;
//   }
  
//   // Check for org-specific role
//   const orgAdminRole = createOrgAdminRole(orgSlug);
//   return authClaims.includes(orgAdminRole);
// }

// ============================================================================
// VALIDATION REGEX
// ============================================================================

/**
 * Regular expression pattern for validating role formats
 * Matches: SuperAdmin, CityAdmin, CityAdminFor:*, AdminFor:*, SwepAdmin, SwepAdminFor:*, OrgAdmin, VolunteerAdmin
 */
export const ROLE_VALIDATION_PATTERN = /^(SuperAdmin|CityAdmin|CityAdminFor:.+|VolunteerAdmin|SwepAdmin|SwepAdminFor:.+|OrgAdmin|AdminFor:.+)$/;

/**
 * Validate an array of roles
 */
export function validateRoles(roles: string[]): { valid: boolean; invalidRoles: string[] } {
  const invalidRoles = roles.filter(role => !isValidRole(role));
  return {
    valid: invalidRoles.length === 0,
    invalidRoles,
  };
}
