import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { IUser } from '../types/index.js';
import Organisation from '../models/organisationModel.js';
import Faq from '../models/faqsModel.js';
import Service from '../models/serviceModel.js';
import Banner from '../models/bannerModel.js';
import { z } from 'zod';
import { BannerPreUploadApiSchema } from '../schemas/bannerSchema.js';
import { BASE_ROLES_ARRAY, isOrgSpecificRole, ROLE_PREFIXES, ROLES } from '../constants/roles.js';
import { HTTP_METHODS } from '../constants/httpMethods.js';
import { 
  sendForbidden, 
  sendNotFound, 
  sendBadRequest, 
  sendInternalError, 
  sendUnauthorized
} from '../utils/apiResponses.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Accommodation from '../models/accommodationModel.js';
import GroupedService from '../models/groupedServiceModel.js';

type PreValidatedBannerData = z.output<typeof BannerPreUploadApiSchema>;
// Extend Request interface to include user
declare module 'express' {
  interface Request {
    user?: IUser;
    preValidatedData?: PreValidatedBannerData;
  }
}

interface JwtPayload {
  sub: string; // Auth0 user ID
  aud: string;
  iss: string;
  exp: number;
  iat: number;
}

/**
 * Helper: handles global privileged access rules for SuperAdmin.
 * - SuperAdmin: full access
 * Returns true if the request has been fully handled (next() called or response sent), otherwise false.
 */
const handleSuperAdminAccess = (
  userAuthClaims: string[]
): boolean => userAuthClaims.includes(ROLES.SUPER_ADMIN);

/**
 * Helper: validates that user roles are properly configured
 * - AuthClaims must not be empty
 * - CityAdmin must have at least one CityAdminFor:* claim
 * - SwepAdmin must have at least one SwepAdminFor:* claim
 * - OrgAdmin must have at least one AdminFor:* claim
 */
const validateUserRoles = (authClaims: string[]): { valid: boolean; error?: string } => {
  // Must have at least one role
  if (!authClaims || authClaims.length === 0) {
    return { valid: false, error: 'User must have at least one role assigned' };
  }

  // Check CityAdmin requires location-specific claim
  if (authClaims.includes(ROLES.CITY_ADMIN)) {
    const hasCityAdminFor = authClaims.some(claim => claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR));
    if (!hasCityAdminFor) {
      return { valid: false, error: 'CityAdmin role requires at least one CityAdminFor:* location claim' };
    }
  }

  // Check SwepAdmin requires location-specific claim
  if (authClaims.includes(ROLES.SWEP_ADMIN)) {
    const hasSwepAdminFor = authClaims.some(claim => claim.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR));
    if (!hasSwepAdminFor) {
      return { valid: false, error: 'SwepAdmin role requires at least one SwepAdminFor:* location claim' };
    }
  }

  // Check OrgAdmin requires org-specific claim
  if (authClaims.includes(ROLES.ORG_ADMIN)) {
    const hasAdminFor = authClaims.some(claim => claim.startsWith(ROLE_PREFIXES.ADMIN_FOR));
    if (!hasAdminFor) {
      return { valid: false, error: 'OrgAdmin role requires at least one AdminFor:* organization claim' };
    }
  }

  return { valid: true };
};

/**
 * Helper: ensures req.user exists. If missing, responds 401 and returns true (handled).
 * Otherwise returns false (caller should continue).
 */
const ensureAuthenticated = (req: Request, res: Response): boolean => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return true;
  }
  return false;
};

/**
 * Helper: checks if user has OrgAdmin access for a specific organization key.
 * Returns true if user has access, false otherwise.
 */
const hasOrgAdminAccess = (userAuthClaims: string[], orgKey: string): boolean => {
  if (!userAuthClaims.includes(ROLES.ORG_ADMIN)) {
    return false;
  }
  const orgAdminClaim = `${ROLE_PREFIXES.ADMIN_FOR}${orgKey}`;
  return userAuthClaims.includes(orgAdminClaim);
};

/**
 * Helper: checks if user has CityAdmin access for any of the provided location IDs.
 * Returns true if user has access to at least one location, false otherwise.
 */
const hasCityAdminLocationAccess = (userAuthClaims: string[], locationIds: string[]): boolean => {
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return false;
  }
  return locationIds.some(locationId =>
    userAuthClaims.includes(`${ROLE_PREFIXES.CITY_ADMIN_FOR}${locationId}`)
  );
};

/**
 * Helper: validates CityAdmin access for multiple locations.
 * Sends forbidden response and returns true if access is denied to any location.
 * Returns false if access is granted to all locations (no response sent).
 */
const validateCityAdminLocationsAccess = (
  userAuthClaims: string[],
  locationIds: string[],
  res: Response
): boolean => {
  if (!locationIds.length) {
    sendForbidden(res, `Access denied. Location should be provided`);
    return true; // Access denied - response sent
  }

  // Check if user has access to ALL locations in the list
  const deniedLocations = locationIds.filter(locationId => {
    const cityAdminClaim = `${ROLE_PREFIXES.CITY_ADMIN_FOR}${locationId}`;
    return !userAuthClaims.includes(cityAdminClaim);
  });
  
  if (deniedLocations.length > 0) {
    sendForbidden(res, `Access denied for location(s): ${deniedLocations.join(', ')}`);
    return true; // Access denied - response sent
  }
  
  return false; // Access granted to all locations
};

/**
 * Helper: extracts location parameters from query string.
 * Supports both single location (?location=manchester) and multiple locations (?locations=manchester,bradford).
 * Returns an array of location slugs, with filtering applied.
 * 
 * @param req - Express Request object
 * @returns Array of location slugs
 */
const extractLocationsFromQuery = (req: Request): string[] => {
  const singleLocation = req.query.location as string | undefined;
  const multipleLocations = req.query.locations as string | undefined;
  
  let locations: string[] = [];
  
  if (singleLocation) {
    locations = [singleLocation];
  } else if (multipleLocations) {
    locations = multipleLocations.split(',').map(l => l.trim()).filter(Boolean);
  }
  
  return locations;
};

/**
 * Middleware to authenticate JWT tokens from Auth0
 */
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Access token required');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Verify JWT token (you may need to implement proper Auth0 verification)
  const decoded = jwt.decode(token) as JwtPayload;
  
  if (!decoded || !decoded.sub) {
    return sendUnauthorized(res, 'Invalid token');
  }

  // Find user in database by Auth0 ID
  const user = await User.findOne({ Auth0Id: decoded.sub.replace('auth0|', '') }).lean();

  if (!user) {
    return sendUnauthorized(res, 'User not found');
  }

  // Check if user is active (not blocked/deactivated)
  if (user.IsActive === false) {
    return sendUnauthorized(res, 'User account is deactivated');
  }

  req.user = user;
  next();
});

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (ensureAuthenticated(req, res)) { return; }

    const userAuthClaims = req.user?.AuthClaims || [];
    
    // Check if user has any of the allowed roles
    const hasAllowedRole = allowedRoles.some(role => 
      userAuthClaims.includes(role)
    );

    if (!hasAllowedRole) {
      return sendForbidden(res);
    }

    next();
  };
};

/**
 * Combined middleware for cities endpoint
 */
export const citiesAuth = [
  authenticate,
  requireRole(BASE_ROLES_ARRAY as string[])
];

/**
 * Middleware for organisation access control based on location and organization
 */
export const requireOrganisationByKeyAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {  
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];

  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // For operations on specific organisations, check access based on role
  const organisationId = req.params.id;
  if (organisationId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    // find by key instead of id
    const organisation = await Organisation.findOne({ Key: organisationId }).lean();
    
    if (!organisation) {
      return sendNotFound(res, 'Organisation');
    }

    // Check OrgAdmin access
    if (hasOrgAdminAccess(userAuthClaims, organisation.Key)) {
      return next();
    }

    // Check CityAdmin access
    const associatedLocationIds = organisation.AssociatedLocationIds || [];
    if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
      return next();
    }

    return sendForbidden(res);
  }

  if (req.body && req.method === HTTP_METHODS.POST) {
    // Check CityAdmin access
    if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
      const associatedLocationIds = req.body?.AssociatedLocationIds || [];
      if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
        return next();
      }
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for service providers endpoint
 */
export const organisationsByKeyAuth = [
  authenticate,
  requireOrganisationByKeyAccess
];

/**
 * Middleware for varifying organisation access control based on location
 */
export const requireVerifyOrganisationAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];

  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // For operations on specific organisations, check access based on role
  const organisationId = req.params.id;
  if (organisationId && (req.method === HTTP_METHODS.PATCH)) {
    const organisation = await Organisation.findById(organisationId).lean();
    
    if (!organisation) {
      return sendNotFound(res, 'Organisation');
    }

    // Check CityAdmin access
    const associatedLocationIds = organisation.AssociatedLocationIds || [];
    if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
      return next();
    }

    return sendForbidden(res);
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for service providers endpoint
 */
export const verifyOrganisationsAuth = [
  authenticate,
  requireVerifyOrganisationAccess
];

/**
 * Middleware for organisation access control based on location and organization
 */
export const requireOrganisationAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];

  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // For operations on specific organisations, check access based on role
  const organisationId = req.params.id;
  if (organisationId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    const organisation = await Organisation.findById(organisationId).lean();
    
    if (!organisation) {
      return sendNotFound(res, 'Organisation');
    }

    // Check OrgAdmin access
    if (hasOrgAdminAccess(userAuthClaims, organisation.Key)) {
      return next();
    }

    // Check CityAdmin access
    const associatedLocationIds = organisation.AssociatedLocationIds || [];
    if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
      return next();
    }

    return sendForbidden(res);
  }

  if (req.body && req.method === HTTP_METHODS.POST) {
    // Check CityAdmin access
    if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
      const associatedLocationIds = req.body?.AssociatedLocationIds || [];
      if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
        return next();
      }
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for service providers endpoint
 */
export const organisationsAuth = [
  authenticate,
  requireOrganisationAccess
];

/**
 * Middleware for organisation location-based access
 */
export const requireOrganisationLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  if (req.method !== HTTP_METHODS.GET) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For location-based access, check the locationId param
  const locations = extractLocationsFromQuery(req);

  if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
    return; // Access denied, response already sent
  }

  next();
};

/**
 * Combined middleware for service providers endpoint
 */
export const organisationsByLocationAuth = [
  authenticate,
  requireOrganisationLocationAccess
];

/**
 * Middleware for service access control based on service provider ownership
 */
export const requireServiceAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // For operations on specific services, check access based on role
  const serviceId = req.params.id;
  if (serviceId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    const service = await GroupedService.findById(serviceId).lean();
    
    if (!service) {
      return sendNotFound(res, 'Service not found');
    }

    // Check OrgAdmin access by ServiceProviderKey
    if (hasOrgAdminAccess(userAuthClaims, service.ProviderId)) {
      return next();
    }

    // Check CityAdmin access by finding the service provider
    if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
      const organisation = await Organisation.findOne({ Key: service.ProviderId }).lean();

      if (!organisation) {
        return sendNotFound(res, 'Associated service provider not found');
      }

      const associatedLocationIds = organisation.AssociatedLocationIds || [];
      if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
        return next();
      }
    }

    return sendForbidden(res);
  }

  if (req.body && req.method === HTTP_METHODS.POST) {
    const organisation = await Organisation.findOne({ Key: req.body.ProviderId }).lean();

    if (!organisation) {
      return sendNotFound(res, 'Associated service provider not found');
    }

    // Check OrgAdmin access
    if (hasOrgAdminAccess(userAuthClaims, organisation.Key)) {
      return next();
    }

    // Check CityAdmin access
    const associatedLocationIds = organisation.AssociatedLocationIds || [];
    if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
      return next();
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for services endpoint
 */
export const servicesAuth = [
  authenticate,
  requireServiceAccess
];

/**
 * Middleware for service access control based on provider ownership
 */
export const requireServicesByProviderAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  if (req.method !== HTTP_METHODS.GET && !req.params.providerId) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];

  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  const providerId = req.params.providerId;

  // Check OrgAdmin access
  if (hasOrgAdminAccess(userAuthClaims, providerId)) {
    return next();
  }

  // CityAdmin access check
  if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    const organisation = await Organisation.findOne({ Key: providerId }).lean();

    if (organisation) {
      // Check CityAdmin access
      const associatedLocationIds = organisation.AssociatedLocationIds || [];
      if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
        return next();
      }
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for services by provider endpoint
 */
export const servicesByProviderAuth = [
  authenticate,
  requireServicesByProviderAccess
];

/**
 * Middleware for accommodations access control based on service provider ownership
 */
export const requireAccommodationsAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // For operations on specific accommodations, check access based on role
  const accommodationId = req.params.id;
  if (accommodationId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    const accommodation = await Accommodation.findById(accommodationId).lean();
    
    if (!accommodation) {
      return sendNotFound(res, 'Accommodation not found');
    }

    // Check OrgAdmin access by ServiceProviderKey
    if (hasOrgAdminAccess(userAuthClaims, accommodation.GeneralInfo.ServiceProviderId)) {
      return next();
    }

    // Check CityAdmin access by finding the service provider
    if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
      const organisation = await Organisation.findOne({ Key: accommodation.GeneralInfo.ServiceProviderId }).lean();
      
      if (!organisation) {
        return sendNotFound(res, 'Associated service provider not found');
      }

      const associatedLocationIds = organisation.AssociatedLocationIds || [];
      if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
        return next();
      }
    }

    return sendForbidden(res);
  }

  if (req.body && req.method === HTTP_METHODS.POST) {
    const organisation = await Organisation.findOne({ 
      Key: req.body.GeneralInfo.ServiceProviderId 
    }).lean();
    
    if (!organisation) {
      return sendNotFound(res, 'Associated service provider not found');
    }

    // Check OrgAdmin access
    if (hasOrgAdminAccess(userAuthClaims, organisation.Key)) {
      return next();
    }

    // Check CityAdmin access
    const associatedLocationIds = organisation.AssociatedLocationIds || [];
    if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
      return next();
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for accommodations endpoint
 */
export const accommodationsAuth = [
  authenticate,
  requireAccommodationsAccess
];

/**
 * Middleware for accommodations access control based on provider ownership
 */
export const requireAccommodationsByProviderAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  if (req.method !== HTTP_METHODS.GET && !req.params.providerId) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];

  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  const providerId = req.params.providerId;

  // Check OrgAdmin access
  if (hasOrgAdminAccess(userAuthClaims, providerId)) {
    return next();
  }

  // CityAdmin access check
  if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    const organisation = await Organisation.findOne({ Key: providerId }).lean();

    if (organisation) {
      // Check CityAdmin access
      const associatedLocationIds = organisation.AssociatedLocationIds || [];
      if (hasCityAdminLocationAccess(userAuthClaims, associatedLocationIds)) {
        return next();
      }
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for accommodations by provider endpoint
 */
export const accommodationsByProviderAuth = [
  authenticate,
  requireAccommodationsByProviderAccess
];

/**
 * Middleware for FAQ access control based on LocationKey
 */
export const requireFaqAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For operations on specific FAQs, check LocationKey access
  const faqId = req.params.id;
  if (faqId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    const faq = await Faq.findById(faqId).lean();
    
    if (!faq) {
      return sendNotFound(res, 'FAQ not found');
    }

    const locationKey = faq.LocationKey;
    
    // If LocationKey is 'general', any CityAdmin can access
    if (locationKey === 'general') {
      return next();
    }

    // For location-based access, check the locationKey
    const locations = (locationKey || '').split(',').map(l => l.trim()).filter(Boolean);
    
    if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
      return; // Access denied, response already sent
    }

    return next();
  }

  if (req.body && req.method === HTTP_METHODS.POST) {
    if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
      // Check if user has access to the specific location
      const cityAdminClaim = `${ROLE_PREFIXES.CITY_ADMIN_FOR}${req.body.LocationKey}`;
      if (userAuthClaims.includes(cityAdminClaim)) {
        return next();
      }
    }
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for FAQs endpoint
 */
export const faqsAuth = [
  authenticate,
  requireFaqAccess
];

/**
 * Middleware for FAQ location-based access
 */
export const requireFaqLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  if (req.method !== HTTP_METHODS.GET) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For location-based access, check the location param
  const locationId = req.params.location;

  // If LocationKey is 'general', any CityAdmin can access
  if (locationId === 'general') {
    return next();
  }

  // For location-based access, check the locationId param
  const locations = extractLocationsFromQuery(req);

  if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
    return; // Access denied, response already sent
  }

  next();
};

/**
 * Combined middleware for FAQs endpoint by location
 */
export const faqsByLocationAuth = [
  authenticate,
  requireFaqLocationAccess
];

/**
 * Middleware for user creation access control
 */
export const requireUserCreationAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  if (req.method !== HTTP_METHODS.POST) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  if (req.method === HTTP_METHODS.POST) {
    const userAuthClaims = req.user?.AuthClaims || [];
  
    // Validate the user being created
    const newUserClaims = req.body.AuthClaims || [];
    
    // Validate roles structure for the new user
    const roleValidation = validateUserRoles(newUserClaims);
    if (!roleValidation.valid) {
      return sendBadRequest(res, roleValidation.error || 'Invalid role configuration');
    }
  
    // SuperAdmin has access to everything.
    if (userAuthClaims.includes(ROLES.SUPER_ADMIN)) {
      return next();
    }
    
    if (userAuthClaims.includes(ROLES.CITY_ADMIN) || userAuthClaims.includes(ROLES.ORG_ADMIN) || userAuthClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
      // OrgAdmin can create OrgAdmin users for their own organization
      if (userAuthClaims.includes(ROLES.ORG_ADMIN) || userAuthClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
        const newAdminForClaims = newUserClaims.filter((claim: string) => claim.startsWith(ROLE_PREFIXES.ADMIN_FOR));

        // VolunteerAdmin can create OrgAdmin users for all organization
        if (userAuthClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
          // Check for each item in newAdminForClaims
          for (const claim of newAdminForClaims) {
            if (isOrgSpecificRole(claim)) {
              return next(); 
            }
          }

          return sendForbidden(res, 'VolunteerAdmin can only create users for organizations');  
        }
        
        // Validate that OrgAdmin can only assign their own organization
        const userOrgClaims = userAuthClaims.filter(claim => claim.startsWith(ROLE_PREFIXES.ADMIN_FOR));
        
        // We use newAdminForClaims[0] with [0] because OrgAdmin user cannot be created for more that 1 organisation per once
        if (!userOrgClaims.includes(newAdminForClaims[0])) {
          return sendForbidden(res, 'OrgAdmin can only create users for organizations they manage');
        }

        // Validate that they're not trying to assign SuperAdmin role or VolunteerAdmin roles or CityAdmin roles
        const requestBody = req.body;
        if (requestBody.AuthClaims && Array.isArray(requestBody.AuthClaims)) {
          if (requestBody.AuthClaims.includes(ROLES.SUPER_ADMIN) || requestBody.AuthClaims.includes(ROLES.VOLUNTEER_ADMIN) || requestBody.AuthClaims.includes(ROLES.CITY_ADMIN)) {
            return sendForbidden(res, 'OrgAdmin cannot assign SuperAdmin, VolunteerAdmin or CityAdmin roles');
          }
        }
      
        return next();
      }

      // CityAdmin can create CityAdmin, SwepAdmin, and OrgAdmin users
      if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
        // Validate that they're not trying to assign SuperAdmin or VolunteerAdmin role
        if (newUserClaims.includes(ROLES.SUPER_ADMIN) || newUserClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
          return sendForbidden(res, 'CityAdmin cannot assign SuperAdmin or VolunteerAdmin roles');
        }

        // Check if creating OrgAdmin with organization-specific claims
        const adminForClaims = newUserClaims.filter((claim: string) => 
          claim.startsWith(ROLE_PREFIXES.ADMIN_FOR)
        );
        
        if (adminForClaims.length > 0) {
          const orgName = adminForClaims[0].replace(ROLE_PREFIXES.ADMIN_FOR, '');
          const organisation = await Organisation.findOne({ Key: orgName }).lean();
          
          if (!organisation) {
            return sendNotFound(res, `Organization ${orgName} not found`);
          }

          const associatedLocationIds = organisation.AssociatedLocationIds || [];
          const hasLocationAccess = associatedLocationIds.some(locationId => 
            userLocations.includes(locationId)
          );
          
          if (!hasLocationAccess) {
            return sendForbidden(res, `Access denied - no permission for organization: ${orgName}`);
          }

          return next();
        }

        // Check if creating CityAdmin or SwepAdmin with organization-specific claims
        // Get the locations this CityAdmin has access to
        const userLocationClaims = userAuthClaims.filter((claim: string) => 
          claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
        );
        const userLocations = userLocationClaims.map((claim: string) => 
          claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '')
        );

        // Check if creating CityAdmin or SwepAdmin with location-specific claims
        const newCityAdminForClaims = newUserClaims.filter((claim: string) => 
          claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
        );
        const newSwepAdminForClaims = newUserClaims.filter((claim: string) => 
          claim.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR)
        );

        // Validate location-specific claims
        const allLocationClaims = [...newCityAdminForClaims, ...newSwepAdminForClaims];
        for (const claim of allLocationClaims) {
          const location = claim.replace(/^(CityAdminFor:|SwepAdminFor:)/, '');
          if (!userLocations.includes(location)) {
            return sendForbidden(res, `Access denied - no permission for location: ${location}`);
          }
        }

        return next();
      }
    }
  }
  
  return sendForbidden(res);
});

/**
 * Combined middleware for user creation endpoint
 */
export const userCreationAuth = [
  authenticate,
  requireUserCreationAccess
];

/**
 * Middleware for delete users access
 */
export const requireDeletionUserAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  if (!(req.method === HTTP_METHODS.DELETE || req.method === HTTP_METHODS.PATCH)) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];
  const userId = req.params.id;

  if (!userId) {
    return sendBadRequest(res, 'User ID is required');
  }

  // 1. SuperAdmin can delete everything
  if (userAuthClaims.includes(ROLES.SUPER_ADMIN)) {
    return next();
  }

  // Fetch the target user to check their roles
  const targetUser = await User.findById(userId).lean();
  
  if (!targetUser) {
    return sendNotFound(res, 'User not found');
  }

  const targetUserClaims = targetUser.AuthClaims || [];

  // 2. CityAdmin can delete specific roles within their city
  if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    // Cannot delete SuperAdmin or VolunteerAdmin
    if (targetUserClaims.includes(ROLES.SUPER_ADMIN) || targetUserClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
      return sendForbidden(res, 'CityAdmin cannot delete/deactivate/activate SuperAdmin or VolunteerAdmin users');
    }

    // Get the locations this CityAdmin has access to
    const userLocationClaims = userAuthClaims.filter((claim: string) => 
      claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
    );
    const userLocations = userLocationClaims.map((claim: string) => 
      claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '')
    );

    // CityAdmin can delete OrgAdmins if they belong to their city
    if (targetUserClaims.includes(ROLES.ORG_ADMIN)) {
      // Get the organization claims from target user
      const targetAdminForClaims = targetUserClaims.filter((claim: string) => 
        claim.startsWith(ROLE_PREFIXES.ADMIN_FOR)
      );

      if (targetAdminForClaims.length === 0) {
        // OrgAdmin without organization claim - shouldn't happen, but allow deletion
        return next();
      }

      // Extract organization key from the claim (AdminFor:orgname)
      const orgKey = targetAdminForClaims[0].replace(ROLE_PREFIXES.ADMIN_FOR, '');

      // Find the organization to get its associated locations
      const organization = await Organisation.findOne({ Key: orgKey }).lean();

      if (!organization) {
        return sendNotFound(res, `Organization not found: ${orgKey}`);
      }

      // Check if organization belongs to any of the CityAdmin's cities
      const orgLocations = organization.AssociatedLocationIds || [];
      const hasLocationAccess = orgLocations.some(location => userLocations.includes(location));

      if (!hasLocationAccess) {
        return sendForbidden(res, `Access denied - OrgAdmin's organization is not in your managed cities`);
      }

      return next();
    }

    // CityAdmin can delete CityAdmins and SwepAdmins if they belong to their city
    if (targetUserClaims.includes(ROLES.CITY_ADMIN) || targetUserClaims.includes(ROLES.SWEP_ADMIN)) {
      // Check if target user is CityAdmin with location-specific claims
      const targetCityAdminForClaims = targetUserClaims.filter((claim: string) => 
        claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
      );

      if (targetCityAdminForClaims.length > 0) {
        // Validate all location claims belong to CityAdmin's locations
        for (const claim of targetCityAdminForClaims) {
          const location = claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '');
          if (!userLocations.includes(location)) {
            return sendForbidden(res, `Access denied - cannot delete CityAdmin for location: ${location}`);
          }
        }
        return next();
      }

      // Check if target user is SwepAdmin with location-specific claims
      const targetSwepAdminForClaims = targetUserClaims.filter((claim: string) => 
        claim.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR)
      );

      if (targetSwepAdminForClaims.length > 0) {
        // Validate all location claims belong to CityAdmin's locations
        for (const claim of targetSwepAdminForClaims) {
          const location = claim.replace(ROLE_PREFIXES.SWEP_ADMIN_FOR, '');
          if (!userLocations.includes(location)) {
            return sendForbidden(res, `Access denied - cannot delete SwepAdmin for location: ${location}`);
          }
        }
        return next();
      }

      // If none of the above conditions match, deny access
      return sendForbidden(res, 'CityAdmin cannot delete this user');
    }
  }

  // No valid role found
  return sendForbidden(res);
});

/**
 * Combined middleware for users endpoint
 */
export const usersDeletionAuth = [
  authenticate,
  requireDeletionUserAccess
];

/**
 * Middleware for users access
 */
export const requireUserAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  if (!(req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH)) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];
  const method = req.method;
  const userId = req.params.id;

  // 1. SuperAdmin can do everything
  if (userAuthClaims.includes(ROLES.SUPER_ADMIN)) {
    // For updates, validate role structure
    if (method === HTTP_METHODS.PUT || method === HTTP_METHODS.PATCH) {
      const requestBody = req.body;
      if (requestBody.AuthClaims && Array.isArray(requestBody.AuthClaims)) {
        // Validate role structure (must have roles and proper location/org claims)
        const roleValidation = validateUserRoles(requestBody.AuthClaims);
        if (!roleValidation.valid) {
          return sendBadRequest(res, roleValidation.error || 'Invalid role configuration');
        }
      }
    }
    return next();
  }

  // 2. CityAdmin - complex permissions
  if (userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    const targetUser = await User.findById(userId).lean();
      
    if (!targetUser) {
      return sendNotFound(res, 'User not found');
    }

    const targetUserClaims = targetUser.AuthClaims || [];

    if (method === HTTP_METHODS.GET) {
      // For GET requests, check if CityAdmin has access to user's location
      // Check three ways: AssociatedProviderLocationIds, CityAdminFor: claims, AdminFor: claims
      
      // Get CityAdmin's accessible locations
      const currentUserCityClaims = userAuthClaims.filter(claim => 
        claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
      );
      const currentUserLocationIds = currentUserCityClaims.map(claim => 
        claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '')
      );
      
      let hasAccess = false;
      
      // 1. Check AssociatedProviderLocationIds
      const userLocationIds = targetUser.AssociatedProviderLocationIds || [];
      if (userLocationIds.length > 0) {
        hasAccess = userLocationIds.some(locId => 
          currentUserLocationIds.includes(String(locId))
        );
      }
      
      // 2. Check if target user has CityAdminFor: claims matching current user's locations
      if (!hasAccess) {
        const targetUserCityClaims = targetUserClaims.filter(claim => 
          claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
        );
        const targetUserLocationIds = targetUserCityClaims.map(claim => 
          claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '')
        );
        
        hasAccess = targetUserLocationIds.some(locId => 
          currentUserLocationIds.includes(locId)
        );
      }
      
      // 3. Check if target user has AdminFor: (OrgAdmin) claims where org location matches
      if (!hasAccess) {
        const targetOrgClaims = targetUserClaims.filter(claim => 
          claim.startsWith(ROLE_PREFIXES.ADMIN_FOR)
        );
        
        if (targetOrgClaims.length > 0) {
          const hasOrgInUserCities = await Promise.all(
            targetOrgClaims.map(async (orgClaim) => {
              const orgKey = orgClaim.replace(ROLE_PREFIXES.ADMIN_FOR, '');
              const sp = await Organisation.findOne({ Key: orgKey }).lean();
              if (!sp) return false;
              const associated: string[] = Array.isArray(sp.AssociatedLocationIds) 
                ? sp.AssociatedLocationIds 
                : [];
              return associated.some(locId => currentUserLocationIds.includes(String(locId)));
            })
          );
          hasAccess = hasOrgInUserCities.some(Boolean);
        }
      }
      
      if (!hasAccess) {
        return sendForbidden(res, 'CityAdmin can only view users in their assigned locations');
      }
      
      return next();
    }

    if (method === HTTP_METHODS.PUT || method === HTTP_METHODS.PATCH) {
      // CityAdmin cannot update SuperAdmin or VolunteerAdmin users
      if (targetUserClaims.includes(ROLES.SUPER_ADMIN) || targetUserClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
        return sendForbidden(res, 'CityAdmin cannot update SuperAdmin or VolunteerAdmin users');
      }

      // Validate that they're not trying to assign SuperAdmin or VolunteerAdmin role
      const requestBody = req.body;
      if (requestBody.AuthClaims && Array.isArray(requestBody.AuthClaims)) {
        if (requestBody.AuthClaims.includes(ROLES.SUPER_ADMIN) || requestBody.AuthClaims.includes(ROLES.VOLUNTEER_ADMIN)) {
          return sendForbidden(res, 'CityAdmin cannot assign SuperAdmin or VolunteerAdmin roles');
        }
        
        // Validate role structure (must have roles and proper location/org claims)
        const roleValidation = validateUserRoles(requestBody.AuthClaims);
        if (!roleValidation.valid) {
          return sendBadRequest(res, roleValidation.error || 'Invalid role configuration');
        }

        // Validate that CityAdmin is not trying to remove roles from different locations
        // Get original user data from database to compare

        const newAuthClaims = requestBody.AuthClaims;

        // Find removed roles (present in original but not in new)
        const removedRoles = targetUserClaims.filter(
          (claim: string) => !newAuthClaims.includes(claim)
        );

        // Extract current user's location claims
        const currentUserLocationClaims = userAuthClaims.filter(claim => 
          claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)
        );
        const currentUserLocationIds = currentUserLocationClaims.map(claim => 
          claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '')
        );

        // Validate each removed role
        for (const removedRole of removedRoles) {
          // Check if removed role is a location-specific role (CityAdminFor or SwepAdminFor)
          if (removedRole.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)) {
            const locationId = removedRole.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '');
            if (!currentUserLocationIds.includes(locationId)) {
              return sendForbidden(
                res, 
                `Cannot remove CityAdmin role for location '${locationId}' - you don't have permission to manage this location`
              );
            }
          } else if (removedRole.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR)) {
            const locationId = removedRole.replace(ROLE_PREFIXES.SWEP_ADMIN_FOR, '');
            if (!currentUserLocationIds.includes(locationId)) {
              return sendForbidden(
                res, 
                `Cannot remove SwepAdmin role for location '${locationId}' - you don't have permission to manage this location`
              );
            }
          } else if (removedRole.startsWith(ROLE_PREFIXES.ADMIN_FOR)) {
            // For OrgAdmin roles, validate org belongs to CityAdmin's location
            const orgKey = removedRole.replace(ROLE_PREFIXES.ADMIN_FOR, '');
            const sp = await Organisation.findOne({ Key: orgKey }).lean();
            
            if (sp) {
              const associated: string[] = Array.isArray(sp.AssociatedLocationIds) 
                ? sp.AssociatedLocationIds 
                : [];
              const hasLocationAccess = associated.some(locId => 
                currentUserLocationIds.includes(String(locId))
              );
              
              if (!hasLocationAccess) {
                return sendForbidden(
                  res, 
                  `Cannot remove OrgAdmin role for organization '${orgKey}' - organization doesn't belong to your managed locations`
                );
              }
            }
          }
        }

        // Validate added roles (present in new but not in original)
        const addedRoles = newAuthClaims.filter(
          (claim: string) => !targetUserClaims.includes(claim)
        );

        // Validate each added role - CityAdmin can only add roles for their locations
        for (const addedRole of addedRoles) {
          // Skip base roles validation (they're auto-managed)
          if (BASE_ROLES_ARRAY.includes(addedRole)) {
            continue;
          }

          // Check if added role is a location-specific role
          if (addedRole.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR)) {
            const locationId = addedRole.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, '');
            if (!currentUserLocationIds.includes(locationId)) {
              return sendForbidden(
                res, 
                `Cannot add CityAdmin role for location '${locationId}' - you don't have permission to manage this location`
              );
            }
          } else if (addedRole.startsWith(ROLE_PREFIXES.SWEP_ADMIN_FOR)) {
            const locationId = addedRole.replace(ROLE_PREFIXES.SWEP_ADMIN_FOR, '');
            if (!currentUserLocationIds.includes(locationId)) {
              return sendForbidden(
                res, 
                `Cannot add SwepAdmin role for location '${locationId}' - you don't have permission to manage this location`
              );
            }
          } else if (addedRole.startsWith(ROLE_PREFIXES.ADMIN_FOR)) {
            // For OrgAdmin roles, validate org belongs to CityAdmin's location
            const orgKey = addedRole.replace(ROLE_PREFIXES.ADMIN_FOR, '');
            const sp = await Organisation.findOne({ Key: orgKey }).lean();
            
            if (sp) {
              const associated: string[] = Array.isArray(sp.AssociatedLocationIds) 
                ? sp.AssociatedLocationIds 
                : [];
              const hasLocationAccess = associated.some(locId => 
                currentUserLocationIds.includes(String(locId))
              );
              
              if (!hasLocationAccess) {
                return sendForbidden(
                  res, 
                  `Cannot add OrgAdmin role for organization '${orgKey}' - organization doesn't belong to your managed locations`
                );
              }
            }
          }
        }
      }
      
      return next();
    }
  }

  // No valid role found
  return sendForbidden(res);
});

/**
 * Combined middleware for users endpoint
 */
export const usersAuth = [
  authenticate,
  requireUserAccess
];

/**
 * Middleware for user location-based access
 */
export const requireUserLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  if (req.method !== HTTP_METHODS.GET) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For location-based access, check the location and locations param
  const locations = extractLocationsFromQuery(req);

  if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
    return; // Access denied, response already sent
  }

  next();
};

/**
 * Combined middleware for users endpoint by location
 */
export const usersByLocationAuth = [
  authenticate,
  requireUserLocationAccess
];

/**
 * Middleware for banner access control with location validation
 */
export const requireBannerAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) { return; }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }
  
  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For operations on specific banners, check LocationId access
  const bannerId = req.params.id;
  if (bannerId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    try {
      const banner = await Banner.findById(bannerId).lean();

      // For location-based access, check the LocationSlug
      const locations = (banner?.LocationSlug || '').split(',').map(l => l.trim()).filter(Boolean);
        
      if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
        return; // Access denied, response already sent
      }
  
      next();
    } catch (error) {
      console.error('Error validating banner access:', error);
      return sendInternalError(res);
    }   
  }

  if (req.method === HTTP_METHODS.POST) {
    // For location-based access, check the LocationSlug
    const locations = (req.body?.LocationSlug || '').split(',').map(l => l.trim()).filter(Boolean);
      
    if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
      return; // Access denied, response already sent
    }

    return next();
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for banners endpoint
 */
export const bannersAuth = [
  authenticate,
  requireBannerAccess
];

/**
 * Middleware for banner location-based access
 */
export const requireBannerLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  if (req.method !== HTTP_METHODS.GET) {
    return sendForbidden(res, 'Invalid HTTP method for this endpoint');
  }

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For location-based access, check the location and locations param
  const locations = extractLocationsFromQuery(req);

  if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
    return; // Access denied, response already sent
  }

  next();
};

/**
 * Combined middleware for banners endpoint by location
 */
export const bannersByLocationAuth = [
  authenticate,
  requireBannerLocationAccess
];


/**
 * Middleware for SWEP banner access control with location validation
 */
export const requireSwepBannerAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user has SwepAdmin role
  if (!userAuthClaims.includes(ROLES.SWEP_ADMIN) && !userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For operations on specific SWEP banners, check LocationId access
  const swepBannerId = req.params.id;
  if (swepBannerId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.PATCH || req.method === HTTP_METHODS.DELETE)) {
    try{
      // TODO: When SwepBanner model is created with LocationId field, validate against user's CityAdminFor claims
      // For now, allow any SwepAdmin+CityAdmin to access
      // const banner = await SwepBanner.findById(swepBannerId).lean();

      // // For location-based access, check the LocationSlug
      // const locations = (banner?.LocationSlug || '').split(',').map(l => l.trim()).filter(Boolean);
        
      // if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
      //   return; // Access denied, response already sent
      // }

      // next();
    }
    catch (error) {
      console.error('Error validating SWEP banner access:', error);
      return sendInternalError(res);
    }
  }

  if (req.method === HTTP_METHODS.POST) {
    // For location-based access, check the LocationSlug
    const locations = (req.body?.LocationId || '').split(',').map(l => l.trim()).filter(Boolean);
      
    if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
      return; // Access denied, response already sent
    }

    return next();
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for SWEP banners endpoint
 */
export const swepBannersAuth = [
  authenticate,
  requireSwepBannerAccess
];

/**
 * Middleware for SWEP banners location-based access
 */
export const requireSwepBannerLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user has SwepAdmin role
  if (!userAuthClaims.includes(ROLES.SWEP_ADMIN) && !userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For location-based access, check the location and locations param
  const locations = extractLocationsFromQuery(req);

  if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
    return; // Access denied, response already sent
  }

  next();
};

/**
 * Combined middleware for SWEP banners endpoint
 */
export const swepBannersByLocationAuth = [
  authenticate,
  requireSwepBannerLocationAccess
];

/**
 * Middleware for resource access control with location validation
 */
export const requireResourceAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For operations on specific resources, check LocationId access
  const resourceId = req.params.id;
  if (resourceId && (req.method === HTTP_METHODS.GET || req.method === HTTP_METHODS.PUT || req.method === HTTP_METHODS.DELETE)) {
    try{
      // TODO: When Resource model is created with LocationId field, validate against user's CityAdminFor claims
      // For now, allow any CityAdmin to access
      // const resource = await Resource.findById(resourceId).lean();

      // // For location-based access, check the LocationSlug
      // const locations = (banner?.LocationSlug || '').split(',').map(l => l.trim()).filter(Boolean);
        
      // if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
      //   return; // Access denied, response already sent
      // }

      // next();
    }
    catch (error) {
      console.error('Error validating resource access:', error);
      return sendInternalError(res);
    }   
  }

  if (req.body && req.method === HTTP_METHODS.POST) {
    // For location-based access, check the LocationSlug
    const locations = (req.body?.LocationId || '').split(',').map(l => l.trim()).filter(Boolean);
      
    if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
      return; // Access denied, response already sent
    }

    return next();
  }

  return sendForbidden(res);
});

/**
 * Combined middleware for resources endpoint
 */
export const resourcesAuth = [
  authenticate,
  requireResourceAccess
];

/**
 * Middleware for resource location-based access (GET /resources/location/:locationId)
 */
export const requireResourceLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (ensureAuthenticated(req, res)) return;

  const userAuthClaims = req.user?.AuthClaims || [];
  
  // SuperAdmin global rule
  if (handleSuperAdminAccess(userAuthClaims)) { return next(); }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes(ROLES.CITY_ADMIN)) {
    return sendForbidden(res);
  }

  // For location-based access, check the location and locations param
  const locations = extractLocationsFromQuery(req);
  
  if (validateCityAdminLocationsAccess(userAuthClaims, locations, res)) {
    return; // Access denied, response already sent
  }

  next();
};

/**
 * Combined middleware for resources endpoint by location
 */
export const resourcesByLocationAuth = [
  authenticate,
  requireResourceLocationAccess
];
