import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '@/models/userModel.js';
import { IUser } from '@/types/index.js';
import ServiceProvider from '@/models/serviceProviderModel.js';
import Faq from '@/models/faqsModel.js';
import Service from '@/models/serviceModel.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
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
 * Middleware to authenticate JWT tokens from Auth0
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token (you may need to implement proper Auth0 verification)
    const decoded = jwt.decode(token) as JwtPayload;
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Find user in database by Auth0 ID
    const user = await User.findOne({ Auth0Id: decoded.sub });
    debugger
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userAuthClaims = req.user.AuthClaims || [];
    
    // Check if user has any of the allowed roles
    const hasAllowedRole = allowedRoles.some(role => 
      userAuthClaims.includes(role)
    );

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: allowedRoles,
        userRoles: userAuthClaims
      });
    }

    next();
  };
};

/**
 * Combined middleware for cities endpoint
 */
export const citiesAuth = [
  authenticate,
  requireRole(['SuperAdmin'])
];

/**
 * Middleware for service provider access control based on location and organization
 */
export const requireServiceProviderAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // VolunteerAdmin has full access
  if (userAuthClaims.includes('VolunteerAdmin')) {
    return next();
  }

  // For operations on specific service providers, check access based on role
  const serviceProviderId = req.params.id;
  if (serviceProviderId && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    try {
      const serviceProvider = await ServiceProvider.findById(serviceProviderId).lean();
      
      if (!serviceProvider) {
        return res.status(404).json({
          success: false,
          error: 'Service provider not found'
        });
      }

      // Check OrgAdmin access
      if (userAuthClaims.includes('OrgAdmin')) {
        const orgKey = serviceProvider.Key;
        const orgAdminClaim = `AdminFor:${orgKey}`;
        if (userAuthClaims.includes(orgAdminClaim)) {
          return next();
        }
      }

      // Check CityAdmin access
      if (userAuthClaims.includes('CityAdmin')) {
        const associatedLocationIds = serviceProvider.AssociatedLocationIds || [];
        const hasLocationAccess = associatedLocationIds.some(locationId => 
          userAuthClaims.includes(`CityAdminFor:${locationId}`)
        );
        if (hasLocationAccess) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions for this service provider'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error validating service provider access'
      });
    }
  }

  if (req.body && req.method === 'POST') {
    if (userAuthClaims.includes('CityAdmin')) {
      const associatedLocationIds = req.body?.AssociatedLocationIds || [];
      const hasLocationAccess = associatedLocationIds.some((locationId: string) => 
        userAuthClaims.includes(`CityAdminFor:${locationId}`)
      );
      if (hasLocationAccess) {
        return next();
      }
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

/**
 * Combined middleware for service providers endpoint
 */
export const serviceProvidersAuth = [
  authenticate,
  requireServiceProviderAccess
];


/**
 * Middleware for service provider location-based access (GET /service-providers/location/:locationId)
 */
export const requireServiceProviderLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role required'
    });
  }

  // For location-based access, check the locationId param
  const locationId = req.params.locationId;
  if (locationId) {
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (!userAuthClaims.includes(cityAdminClaim)) {
      return res.status(403).json({
        success: false,
        error: `Access denied for location: ${locationId}`
      });
    }
  }

  next();
};

/**
 * Combined middleware for service providers endpoint
 */
export const serviceProvidersByLocationAuth = [
  authenticate,
  requireServiceProviderLocationAccess
];

/**
 * Middleware for service access control based on service provider ownership
 */
export const requireServiceAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // VolunteerAdmin has full access
  if (userAuthClaims.includes('VolunteerAdmin')) {
    return next();
  }

  // For operations on specific services, check access based on role
  const serviceId = req.params.id;
  if (serviceId && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    try {
      const service = await Service.findById(serviceId).lean();
      
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      // Check OrgAdmin access by ServiceProviderKey
      if (userAuthClaims.includes('OrgAdmin')) {
        const serviceProviderKey = service.ServiceProviderKey;
        const orgAdminClaim = `AdminFor:${serviceProviderKey}`;
        if (userAuthClaims.includes(orgAdminClaim)) {
          return next();
        }
      }

      // Check CityAdmin access by finding the service provider
      if (userAuthClaims.includes('CityAdmin')) {
        const serviceProvider = await ServiceProvider.findOne({ 
          _id: service.ParentId 
        }).lean();
        
        if (!serviceProvider) {
          return res.status(404).json({
            success: false,
            error: 'Associated service provider not found'
          });
        }

        const associatedLocationIds = serviceProvider.AssociatedLocationIds || [];
        const hasLocationAccess = associatedLocationIds.some((locationId: string) => 
          userAuthClaims.includes(`CityAdminFor:${locationId}`)
        );
        
        if (hasLocationAccess) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions for this service'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error validating service access'
      });
    }
  }

  if (req.body && req.method === 'POST') {
    if (userAuthClaims.includes('OrgAdmin')) {
      const serviceProvider = await ServiceProvider.findOne({ 
        _id: req.body.ParentId 
      }).lean();
      
      if (!serviceProvider) {
        return res.status(404).json({
          success: false,
          error: 'Associated service provider not found'
        });
      }

      const serviceProviderKey = serviceProvider.Key;
      const orgAdminClaim = `AdminFor:${serviceProviderKey}`;
      if (userAuthClaims.includes(orgAdminClaim)) {
        return next();
      }
    }

    if (userAuthClaims.includes('CityAdmin')) {
      const serviceProvider = await ServiceProvider.findOne({ 
        _id: req.body.ParentId 
      }).lean();
      
      if (!serviceProvider) {
        return res.status(404).json({
          success: false,
          error: 'Associated service provider not found'
        });
      }
  
      const associatedLocationIds = serviceProvider.AssociatedLocationIds || [];
      const hasLocationAccess = associatedLocationIds.some((locationId: string) => 
        userAuthClaims.includes(`CityAdminFor:${locationId}`)
      );
      
      if (hasLocationAccess) {
        return next();
      }
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

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
export const requireServicesByProviderAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];

  // SuperAdmin and VolunteerAdmin have full access
  if (userAuthClaims.includes('SuperAdmin') || userAuthClaims.includes('VolunteerAdmin')) {
    return next();
  }

  const providerId = req.params.providerId;
  if (!providerId) {
    return res.status(400).json({
      success: false,
      error: 'Provider ID is required'
    });
  }

  // OrgAdmin access check
  if (userAuthClaims.includes('OrgAdmin')) {
    const orgAdminClaim = `AdminFor:${providerId}`;
    if (userAuthClaims.includes(orgAdminClaim)) {
      return next();
    }
  }

  // CityAdmin access check
  if (userAuthClaims.includes('CityAdmin')) {
    const serviceProvider = await ServiceProvider.findById(providerId).lean();
    if (serviceProvider) {
      const associatedLocationIds = serviceProvider.AssociatedLocationIds || [];
      const hasLocationAccess = associatedLocationIds.some((locationId: string) => 
        userAuthClaims.includes(`CityAdminFor:${locationId}`)
      );
      if (hasLocationAccess) {
        return next();
      }
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied'
  });
};

/**
 * Combined middleware for services by provider endpoint
 */
export const servicesByProviderAuth = [
  authenticate,
  requireServicesByProviderAccess
];

/**
 * Middleware for FAQ access control based on LocationKey
 */
export const requireFaqAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role required'
    });
  }

  // For operations on specific FAQs, check LocationKey access
  const faqId = req.params.id;
  if (faqId && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    try {
      const faq = await Faq.findById(faqId).lean();
      
      if (!faq) {
        return res.status(404).json({
          success: false,
          error: 'FAQ not found'
        });
      }

      const locationKey = faq.LocationKey;
      
      // If LocationKey is 'general', any CityAdmin can access
      if (locationKey === 'general') {
        return next();
      }
      
      // Check if user has access to the specific location
      const cityAdminClaim = `CityAdminFor:${locationKey}`;
      if (!userAuthClaims.includes(cityAdminClaim)) {
        return res.status(403).json({
          success: false,
          error: `Access denied for location: ${locationKey}`
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error validating FAQ access'
      });
    }
  }

  if (req.body && req.method === 'POST') {
    if (userAuthClaims.includes('CityAdmin')) {
      // Check if user has access to the specific location
      const cityAdminClaim = `CityAdminFor:${req.body.LocationKey}`;
      if (req.body.LocationKey === 'general' || userAuthClaims.includes(cityAdminClaim)) {
        return next();
      }
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

/**
 * Combined middleware for FAQs endpoint
 */
export const faqsAuth = [
  authenticate,
  requireFaqAccess
];

/**
 * Middleware for user creation access control
 */
export const requireUserCreationAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // TODO: Check if user exists. We can check by email in the database. But email is decoded. Can we somehow check if user exists?

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin can create any user
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Validate the user being created
  const newUserClaims = req.body.AuthClaims || [];
  
  if (userAuthClaims.includes('CityAdmin') || userAuthClaims.includes('OrgAdmin')) {
    // Check if new user only has OrgAdmin and AdminFor roles
    const hasOrgAdminRole = newUserClaims.some((claim: string) => 
      claim === 'OrgAdmin'
    );
    
    const hasOrgAdminForRole = newUserClaims.some((claim: string) => 
      claim.startsWith('AdminFor:')
    );

    if (newUserClaims.length !== 2 || !hasOrgAdminRole || !hasOrgAdminForRole) {
      return res.status(403).json({
        success: false,
        error: 'User can only create users with OrgAdmin role'
      });
    }

    // CityAdmin can create OrgAdmin users
    if (userAuthClaims.includes('CityAdmin')) {
      // Validate that CityAdmin has access to the organizations being assigned
      const adminForClaims = newUserClaims.filter((claim: string) => claim.startsWith('AdminFor:'));  
      const orgName = adminForClaims[0].replace('AdminFor:', '');
      
      try {
        const serviceProvider = await ServiceProvider.findOne({ Key: orgName }).lean();
        
        if (!serviceProvider) {
          return res.status(404).json({
            success: false,
            error: `Organization ${orgName} not found`
          });
        }

        const associatedLocationIds = serviceProvider.AssociatedLocationIds || [];
        const hasLocationAccess = associatedLocationIds.some(locationId => 
          userAuthClaims.includes(`CityAdminFor:${locationId}`)
        );
        
        if (!hasLocationAccess) {
          return res.status(403).json({
            success: false,
            error: `Access denied - no permission for organization: ${orgName}`
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Error validating organization access'
        });
      }
      
      return next();
    }

    // OrgAdmin can create OrgAdmin users for their own organization
    if (userAuthClaims.includes('OrgAdmin')) {
      // Validate that OrgAdmin can only assign their own organization
      const newAdminForClaims = newUserClaims.filter((claim: string) => claim.startsWith('AdminFor:'));
      const userOrgClaims = userAuthClaims.filter(claim => claim.startsWith('AdminFor:'));
      
      if (!userOrgClaims.includes(newAdminForClaims[0])) {
        return res.status(403).json({
          success: false,
          error: 'OrgAdmin can only create users for organizations they manage'
        });
      }
      
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions to create users'
  });
};

/**
 * Combined middleware for user creation endpoint
 */
export const userCreationAuth = [
  authenticate,
  requireUserCreationAccess
];

/**
 * Combined middleware for users endpoint
 */
export const usersAuth = [
  authenticate,
  requireRole(['SuperAdmin'])
];

/**
 * Middleware for banner access control with location validation
 */
export const requireBannerAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role required'
    });
  }

  // For operations on specific banners, check LocationId access
  const bannerId = req.params.id;
  if (bannerId && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    // TODO: When Banner model is created with LocationId field, validate against user's CityAdminFor claims
    // For now, allow any CityAdmin to access
    // const banner = await Banner.findById(bannerId).lean();
    // const locationId = banner.LocationId;
    // const cityAdminClaim = `CityAdminFor:${locationId}`;
    // if (!userAuthClaims.includes(cityAdminClaim)) { return 403; }
  }

  if (req.method === 'POST' && userAuthClaims.includes('CityAdmin')) {
    const locationId = req.body.LocationId;
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (userAuthClaims.includes(cityAdminClaim)) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

/**
 * Combined middleware for banners endpoint
 */
export const bannersAuth = [
  authenticate,
  requireBannerAccess
];

/**
 * Middleware for banner location-based access (GET /banners/location/:locationId)
 */
export const requireBannerLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role required'
    });
  }

  // For location-based access, check the locationId param
  const locationId = req.params.locationId;
  if (locationId) {
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (!userAuthClaims.includes(cityAdminClaim)) {
      return res.status(403).json({
        success: false,
        error: `Access denied for location: ${locationId}`
      });
    }
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
export const requireSwepBannerFullAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user has SwepAdmin role
  if (!userAuthClaims.includes('SwepAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'SWEP admin role required'
    });
  }

  // Additionally check CityAdmin role
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role also required'
    });
  }

  // For operations on specific SWEP banners, check LocationId access
  const swepBannerId = req.params.id;
  if (swepBannerId && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    // TODO: When SwepBanner model is created with LocationId field, validate against user's CityAdminFor claims
    // For now, allow any SwepAdmin+CityAdmin to access
    // const swepBanner = await SwepBanner.findById(swepBannerId).lean();
    // const locationId = swepBanner.LocationId;
    // const cityAdminClaim = `CityAdminFor:${locationId}`;
    // if (userAuthClaims.includes(cityAdminClaim)) { return next(); }
  }

  if (req.method === 'POST') {
    const locationId = req.body.LocationId;
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (userAuthClaims.includes(cityAdminClaim)) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

/**
 * Combined middleware for SWEP banners endpoint
 */
export const swepBannersAuth = [
  authenticate,
  requireSwepBannerFullAccess
];

/**
 * Middleware for SWEP banner location-based access (GET /swep-banners/location/:locationId)
 */
export const requireSwepBannerLocationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user has SwepAdmin role
  if (!userAuthClaims.includes('SwepAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'SWEP admin role required'
    });
  }

  // Additionally check CityAdmin role
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role also required'
    });
  }

  // For location-based access, check the locationId param
  const locationId = req.params.locationId;
  if (locationId) {
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (!userAuthClaims.includes(cityAdminClaim)) {
      return res.status(403).json({
        success: false,
        error: `Access denied for location: ${locationId}`
      });
    }
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
 * Middleware for SWEP banner access control (for PUT operations)
 */
export const requireSwepBannerActivationAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user has SwepAdmin role
  if (!userAuthClaims.includes('SwepAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'SWEP admin role required'
    });
  }

  // Additionally check CityAdmin role
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role also required'
    });
  }

  // TODO: maybe better take LocationId from database when model will be ready
  const locationId = req.body.LocationId;
  const cityAdminClaim = `CityAdminFor:${locationId}`;
  if (userAuthClaims.includes(cityAdminClaim)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

/**
 * Combined middleware for SWEP banners endpoint
 */
export const swepBannersActivationAuth = [
  authenticate,
  requireSwepBannerActivationAccess
];

/**
 * Middleware for resource access control with location validation
 */
export const requireResourceAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role required'
    });
  }

  // For operations on specific resources, check LocationId access
  const resourceId = req.params.id;
  if (resourceId && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    // TODO: When Resource model is created with LocationId field, validate against user's CityAdminFor claims
    // For now, allow any CityAdmin to access
    // const resource = await Resource.findById(resourceId).lean();
    // const locationId = resource.LocationId;
    // const cityAdminClaim = `CityAdminFor:${locationId}`;
    // if (!userAuthClaims.includes(cityAdminClaim)) { return next(); }
  }

  if (req.body && req.method === 'POST') {
    const locationId = req.body.LocationId;
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (userAuthClaims.includes(cityAdminClaim)) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

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
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userAuthClaims = req.user.AuthClaims || [];
  
  // SuperAdmin has access to everything
  if (userAuthClaims.includes('SuperAdmin')) {
    return next();
  }

  // Check if user is a CityAdmin
  if (!userAuthClaims.includes('CityAdmin')) {
    return res.status(403).json({
      success: false,
      error: 'City admin role required'
    });
  }

  // For location-based access, check the locationId param
  const locationId = req.params.locationId;
  if (locationId) {
    const cityAdminClaim = `CityAdminFor:${locationId}`;
    if (userAuthClaims.includes(cityAdminClaim)) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

/**
 * Combined middleware for resources endpoint by location
 */
export const resourcesByLocationAuth = [
  authenticate,
  requireResourceLocationAccess
];

// TODO: Think if we need it and categories api
/**
 * Combined middleware for categories endpoint (SuperAdmin only)
 */
export const categoriesAuth = [
  authenticate,
  requireRole(['SuperAdmin'])
];
