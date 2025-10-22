import { z } from 'zod';

// Helper function for preprocessing numbers
const preprocessNumber = (val: any) => {
  if (typeof val === 'string') {
    const parsed = parseInt(val);
    return isNaN(parsed) ? val : parsed;
  }
  return val;
};

// Location Schema for services
export const ServiceLocationSchema = z.object({
  OutreachLocationDescription: z.string().optional(),
  StreetLine1: z.string().min(1, 'Street address is required'),
  StreetLine2: z.string().optional(),
  StreetLine3: z.string().optional(),
  StreetLine4: z.string().optional(),
  City: z.string().optional(),
  Postcode: z.string().min(1, 'Postcode is required'),
  Location: z.object({
    Latitude: z.number(),
    Longitude: z.number()
  }).optional()
});

// Opening Time Schema (using number format for API)
export const OpeningTimeSchema = z.object({
  Day: z.preprocess(preprocessNumber, z.number().min(0).max(6, 'Day must be between 0 (Sunday) and 6 (Saturday)')),
  StartTime: z.preprocess(preprocessNumber, z.number().min(0).max(2359, 'Start time must be between 0 and 2359')),
  EndTime: z.preprocess(preprocessNumber, z.number().min(0).max(2359, 'End time must be between 0 and 2359')),
}).refine((data) => {
  return data.StartTime < data.EndTime;
}, {
  message: 'End time must be after start time',
  path: ['EndTime']
});

// Service Sub Category Schema
export const ServiceSubCategorySchema = z.object({
  _id: z.string(),
  Name: z.string(),
  Synopsis: z.string().optional()
});

// Main Grouped Service Schema
export const GroupedServiceSchema = z.object({
  _id: z.string().optional(),
  DocumentCreationDate: z.date().optional(),
  DocumentModifiedDate: z.date().optional(),
  CreatedBy: z.string().optional(),
  ProviderId: z.string().min(1, 'Provider ID is required'),
  ProviderName: z.string().optional(),
  ProviderAssociatedLocationIds: z.array(z.string()).optional(),
  CategoryId: z.string().min(1, 'Category is required'),
  CategoryName: z.string().optional(),
  CategorySynopsis: z.string().optional(),
  Info: z.string().optional(),
  Tags: z.array(z.string()).optional(),
  Location: ServiceLocationSchema,
  IsOpen247: z.boolean().default(false),
  OpeningTimes: z.array(OpeningTimeSchema).optional(),
  SubCategories: z.array(ServiceSubCategorySchema).min(1, 'At least one subcategory is required'),
  SubCategoriesIds: z.array(z.string()).optional(),
  IsTelephoneService: z.boolean().optional().default(false),
  IsAppointmentOnly: z.boolean().optional().default(false)
}).refine((data) => {
  // If not open 24/7 and not appointment only, require opening times
  if (!data.IsOpen247 && !data.IsAppointmentOnly) {
    return data.OpeningTimes && data.OpeningTimes.length > 0;
  }
  return true;
}, {
  message: 'Opening times are required when service is not open 24/7 and not appointment only',
  path: ['OpeningTimes']
});

// Validation function
export const validateGroupedService = (data: any) => {
  const result = GroupedServiceSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue: any) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : issue.path,
        message: issue.message
      }))
    };
  }
  
  return {
    success: true,
    data: result.data
  };
};
