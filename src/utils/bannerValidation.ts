import { 
  IBanner, 
  BannerTemplateType, 
  UrgencyLevel, 
  CharterType, 
  ResourceType, 
  LayoutStyle,
  TextColour
} from '@/types/index.js';
import { SUPPORTED_RESOURCE_FILE_TYPES, MAX_RESOURCE_FILE_SIZE } from '@/types/IResourceFile.js';

// Helper function to parse file size string back to bytes for validation
function parseFileSize(sizeString: string): number {
  const match = sizeString.match(/^([\d.]+)\s*(Bytes|KB|MB|GB)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'BYTES': return value;
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    default: return 0;
  }
}
import { BackgroundType, IBannerBackground } from '@/types/IBannerBackground.js';
import { CTAVariant, ICTAButton } from '@/types/ICTAButton.js';
import { IDonationGoal } from '@/types/IDonationGoal.js';
import { IMediaAsset } from '@/types/IMediaAssetSchema.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const GRADIENT_REGEX = /^(linear-gradient|radial-gradient)\(.*\)$/;

export function validateBannerData(data: IBanner): ValidationResult {
  const errors: string[] = [];

  // Required fields validation
  if (!data.Title || typeof data.Title !== 'string' || !data.Title.trim()) {
    errors.push('Title is required and must be a non-empty string');
  } else if (data.Title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!data.TemplateType || !Object.values(BannerTemplateType).includes(data.TemplateType)) {
    errors.push('Valid template type is required');
  }

  if (!data.TextColour || !Object.values(TextColour).includes(data.TextColour)) {
    errors.push('Valid text colour is required');
  }

  if (!data.LayoutStyle || !Object.values(LayoutStyle).includes(data.LayoutStyle)) {
    errors.push('Valid layout style is required');
  }

  // Optional field length validation
  if (data.Description && data.Description.length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  if (data.Subtitle && data.Subtitle.length > 300) {
    errors.push('Subtitle must be 300 characters or less');
  }

  if (data.BadgeText && data.BadgeText.length > 50) {
    errors.push('Badge text must be 50 characters or less');
  }

  // Background validation
  if (!data.Background) {
    errors.push('Background configuration is required');
  } else {
    const background: IBannerBackground = data.Background;

    if (!background.Type || !Object.values(BackgroundType).includes(background.Type)) {
      errors.push('Valid background type is required');
    }

    if (!background.Value || !background.Value.trim()) {
      errors.push('Background value is required');
    } else {
      // Validate background value based on type
      switch (background.Type) {
        case BackgroundType.SOLID:
          if (!HEX_COLOR_REGEX.test(background.Value) && 
              !background.Value.startsWith('rgb') && 
              !background.Value.startsWith('hsl')) {
            errors.push('Solid background must be a valid hex color, RGB, or HSL value');
          }
          break;
        case BackgroundType.GRADIENT:
          if (!GRADIENT_REGEX.test(background.Value)) {
            errors.push('Gradient background must be a valid CSS gradient');
          }
          break;
      }
    }

    // Validate overlay if present
    if (background.Overlay) {
      if (background.Overlay.Colour && !background.Overlay.Colour.trim()) {
        errors.push('Overlay colour cannot be empty when specified');
      }
      if (background.Overlay.Opacity !== undefined && 
          (typeof background.Overlay.Opacity !== 'number' ||
           background.Overlay.Opacity < 0 ||
           background.Overlay.Opacity > 1)) {
        errors.push('Overlay opacity must be a number between 0 and 1');
      }
    }
  }

  // CTA buttons validation
  const ctaButtons: ICTAButton[] = data.CtaButtons;

  if (!ctaButtons || !Array.isArray(ctaButtons) || ctaButtons.length === 0) {
    errors.push('At least one CTA button is required');
  } else if (ctaButtons.length > 3) {
    errors.push('Maximum 3 CTA buttons allowed');
  } else {
    ctaButtons.forEach((button: ICTAButton, index: number) => {
      if (!button.Label || !button.Label.trim()) {
        errors.push(`CTA button ${index + 1} label is required`);
      } else if (button.Label.length > 50) {
        errors.push(`CTA button ${index + 1} label must be 50 characters or less`);
      }

      if (!button.Url || !button.Url.trim()) {
        errors.push(`CTA button ${index + 1} URL is required`);
      } else if (!URL_REGEX.test(button.Url) && !button.Url.startsWith('/')) {
        errors.push(`CTA button ${index + 1} URL must be a valid URL or relative path`);
      }

      if (button.Variant && !Object.values(CTAVariant).includes(button.Variant)) {
        errors.push(`CTA button ${index + 1} variant must be valid`);
      }

      if (button.External !== undefined && typeof button.External !== 'boolean') {
        errors.push(`CTA button ${index + 1} external flag must be a boolean`);
      }
    });
  }

  // Date validation
  if (data.StartDate && data.EndDate) {
    const startDate = new Date(data.StartDate);
    const endDate = new Date(data.EndDate);
    
    if (isNaN(startDate.getTime())) {
      errors.push('Start date must be a valid date');
    }
    
    if (isNaN(endDate.getTime())) {
      errors.push('End date must be a valid date');
    }
    
    if (startDate.getTime() >= endDate.getTime()) {
      errors.push('End date must be after start date');
    }
  }

  // Priority validation
  if (data.Priority !== undefined && data.Priority !== null) {
    if (typeof data.Priority !== 'number' || data.Priority < 1 || data.Priority > 10) {
      errors.push('Priority must be a number between 1 and 10');
    }
  }

  // Media assets validation
  if (data.Logo) {
    const logoValidation = validateMediaAsset(data.Logo);
    if (!logoValidation.isValid) {
      logoValidation.errors.forEach(error => {
        errors.push(`Logo: ${error}`);
      });
    }
  }

  if (data.BackgroundImage) {
    const backgroundImageValidation = validateMediaAsset(data.BackgroundImage);
    if (!backgroundImageValidation.isValid) {
      backgroundImageValidation.errors.forEach(error => {
        errors.push(`Background image: ${error}`);
      });
    }
  }

  if (data.SplitImage) {
    const splitImageValidation = validateMediaAsset(data.SplitImage);
    if (!splitImageValidation.isValid) {
      splitImageValidation.errors.forEach(error => {
        errors.push(`Split image: ${error}`);
      });
    }
  }

  // Template-specific validation
  switch (data.TemplateType) {
    case BannerTemplateType.GIVING_CAMPAIGN:
      validateGivingCampaignFields(data, errors);
      break;
    case BannerTemplateType.PARTNERSHIP_CHARTER:
      validatePartnershipCharterFields(data, errors);
      break;
    case BannerTemplateType.RESOURCE_PROJECT:
      validateResourceProjectFields(data, errors);
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateGivingCampaignFields(data: IBanner, errors: string[]): void {
  const donationGoal: IDonationGoal | undefined = data.DonationGoal;

  if (donationGoal) {
    if (typeof donationGoal.Target !== 'number' || donationGoal.Target <= 0) {
      errors.push('Donation goal target must be a positive number');
    }

    if (typeof donationGoal.Current !== 'number' || donationGoal.Current < 0) {
      errors.push('Donation goal current amount must be a non-negative number');
    }

    if (donationGoal.Current > donationGoal.Target) {
      errors.push('Current donation amount cannot exceed target');
    }

    if (!donationGoal.Currency || typeof donationGoal.Currency !== 'string' || donationGoal.Currency.length !== 3) {
      errors.push('Donation goal currency must be a valid 3-letter currency code');
    }
  }

  if (data.UrgencyLevel && !Object.values(UrgencyLevel).includes(data.UrgencyLevel)) {
    errors.push('Urgency level must be valid');
  }

  if (data.CampaignEndDate) {
    const endDate = new Date(data.CampaignEndDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Campaign end date must be a valid date');
    } else if (endDate <= new Date()) {
      errors.push('Campaign end date must be in the future');
    }
  }
}

function validatePartnershipCharterFields(data: IBanner, errors: string[]): void {
  if (data.CharterType && !Object.values(CharterType).includes(data.CharterType)) {
    errors.push('Charter type must be valid');
  }

  if (data.SignatoriesCount !== undefined && data.SignatoriesCount !== null) {
    if (typeof data.SignatoriesCount !== 'number' || data.SignatoriesCount < 0) {
      errors.push('Signatories count must be a non-negative number');
    }
  }

  // Validate partner logos array
  if (data.PartnerLogos) {
    if (!Array.isArray(data.PartnerLogos)) {
      errors.push('Partner logos must be an array');
    } else if (data.PartnerLogos.length > 5) {
      errors.push('A banner cannot have more than 5 partner logos in total');
    } else {
      data.PartnerLogos.forEach((logo: IMediaAsset, index: number) => {
        const logoValidation = validateMediaAsset(logo);
        if (!logoValidation.isValid) {
          logoValidation.errors.forEach(error => {
            errors.push(`Partner logo ${index + 1}: ${error}`);
          });
        }
      });
    }
  }
}

function validateResourceProjectFields(data: IBanner, errors: string[]): void {
  if (data.ResourceFile) {
    const resourceFile = data.ResourceFile;
    
    if (!resourceFile.FileUrl) {
      errors.push('Resource file URL is required');
    }
    
    if (resourceFile.ResourceType && !Object.values(ResourceType).includes(resourceFile.ResourceType)) {
      errors.push('Resource type must be valid');
    }

    if (resourceFile.DownloadCount !== undefined && resourceFile.DownloadCount !== null) {
      if (typeof resourceFile.DownloadCount !== 'number' || resourceFile.DownloadCount < 0) {
        errors.push('Download count must be a non-negative number');
      }
    }

    if (resourceFile.FileType) {
      if (typeof resourceFile.FileType !== 'string') {
        errors.push('File type must be a string');
      } else if (resourceFile.FileType.length > 10) {
        errors.push('File type must be 10 characters or less');
      } else {
        // Validate that the file type is one of the supported types
        const supportedTypes = Object.values(SUPPORTED_RESOURCE_FILE_TYPES).map(type => type.extension);
        const upperFileType = resourceFile.FileType.toUpperCase();
        if (!supportedTypes.includes(upperFileType as any)) {
          errors.push(`Unsupported file type: ${resourceFile.FileType}. Supported types: ${supportedTypes.join(', ')}`);
        }
      }
    }

    if (resourceFile.FileSize) {
      if (typeof resourceFile.FileSize !== 'string') {
        errors.push('File size must be a string');
      } else if (resourceFile.FileSize.length > 20) {
        errors.push('File size must be 20 characters or less');
      } else {
        // Validate file size doesn't exceed maximum
        const fileSizeInBytes = parseFileSize(resourceFile.FileSize);
        if (fileSizeInBytes > MAX_RESOURCE_FILE_SIZE) {
          const maxSizeMB = Math.round(MAX_RESOURCE_FILE_SIZE / (1024 * 1024));
          errors.push(`File size ${resourceFile.FileSize} exceeds maximum allowed size of ${maxSizeMB}MB`);
        }
      }
    }

    if (resourceFile.LastUpdated) {
      const lastUpdated = new Date(resourceFile.LastUpdated);
      if (isNaN(lastUpdated.getTime())) {
        errors.push('Last updated date must be a valid date');
      }
    }
  }
}

// Validate media assets
export function validateMediaAsset(asset: IMediaAsset): ValidationResult {
  const errors: string[] = [];

  if (!asset.Url || !asset.Url.trim()) {
    errors.push('Media asset URL is required');
  } else if (!URL_REGEX.test(asset.Url)) {
    errors.push('Media asset URL must be valid');
  }

  if (!asset.Alt || !asset.Alt.trim()) {
    errors.push('Media asset alt text is required');
  }

  if (asset.Width !== undefined && (typeof asset.Width !== 'number' || asset.Width <= 0)) {
    errors.push('Media asset width must be a positive number');
  }

  if (asset.Height !== undefined && (typeof asset.Height !== 'number' || asset.Height <= 0)) {
    errors.push('Media asset height must be a positive number');
  }

  if (asset.Size !== undefined && (typeof asset.Size !== 'number' || asset.Size <= 0)) {
    errors.push('Media asset size must be a positive number');
  }

  if (asset.Filename && typeof asset.Filename !== 'string') {
    errors.push('Media asset filename must be a string');
  }

  if (asset.MimeType && typeof asset.MimeType !== 'string') {
    errors.push('Media asset MIME type must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate file upload constraints
export function validateFileUpload(file: UploadedFile | null | undefined, maxSize: number = 5 * 1024 * 1024): ValidationResult {
  const errors: string[] = [];

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  if (typeof file.size !== 'number' || file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  if (!file.originalname || typeof file.originalname !== 'string') {
    errors.push('File must have a valid filename');
  }

  if (!file.mimetype || typeof file.mimetype !== 'string') {
    errors.push('File must have a valid MIME type');
  } else {
    // Validate image files
    if (file.mimetype.startsWith('image/')) {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedImageTypes.includes(file.mimetype)) {
        errors.push('Image must be JPEG, PNG, WebP, or SVG format');
      }
    }

    // Videos are not supported for banners
    if (file.mimetype.startsWith('video/')) {
      errors.push('Video files are not supported for banners');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
