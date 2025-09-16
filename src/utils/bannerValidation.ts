import { BannerTemplateType, BackgroundType, TextColour, LayoutStyle, CTAVariant, UrgencyLevel, CharterType, ResourceType } from '../models/bannerModel.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CTAButton {
  label: string;
  url: string;
  variant?: CTAVariant;
  external?: boolean;
  trackingContext?: string;
}

export interface BannerData {
  title: string;
  description?: string;
  subtitle?: string;
  templateType: BannerTemplateType;
  ctaButtons: CTAButton[];
  background: {
    type: BackgroundType;
    value: string;
    overlay?: {
      colour: string;
      opacity: number;
    };
  };
  textColour: TextColour;
  layoutStyle: LayoutStyle;
  startDate?: string;
  endDate?: string;
  badgeText?: string;
  donationGoal?: {
    target: number;
    current: number;
    currency: string;
  };
  urgencyLevel?: UrgencyLevel;
  campaignEndDate?: string;
  charterType?: CharterType;
  signatoriesCount?: number;
  resourceType?: ResourceType;
  downloadCount?: number;
  lastUpdated?: string;
  fileSize?: string;
  fileType?: string;
  priority?: number;
  locationSlug?: string;
}

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const GRADIENT_REGEX = /^(linear-gradient|radial-gradient)\(.*\)$/;

export function validateBannerData(data: BannerData): ValidationResult {
  const errors: string[] = [];

  // Required fields validation
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Title is required and must be a non-empty string');
  } else if (data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!data.templateType || !Object.values(BannerTemplateType).includes(data.templateType)) {
    errors.push('Valid template type is required');
  }

  if (!data.textColour || !Object.values(TextColour).includes(data.textColour)) {
    errors.push('Valid text colour is required');
  }

  if (!data.layoutStyle || !Object.values(LayoutStyle).includes(data.layoutStyle)) {
    errors.push('Valid layout style is required');
  }

  // Optional field length validation
  if (data.description && data.description.length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  if (data.subtitle && data.subtitle.length > 300) {
    errors.push('Subtitle must be 300 characters or less');
  }

  if (data.badgeText && data.badgeText.length > 50) {
    errors.push('Badge text must be 50 characters or less');
  }

  // Background validation
  if (!data.background) {
    errors.push('Background configuration is required');
  } else {
    if (!Object.values(BackgroundType).includes(data.background.type)) {
      errors.push('Valid background type is required');
    }

    if (!data.background.value || !data.background.value.trim()) {
      errors.push('Background value is required');
    } else {
      // Validate background value based on type
      switch (data.background.type) {
        case BackgroundType.SOLID:
          if (!HEX_COLOR_REGEX.test(data.background.value) && 
              !data.background.value.startsWith('rgb') && 
              !data.background.value.startsWith('hsl')) {
            errors.push('Solid background must be a valid hex color, RGB, or HSL value');
          }
          break;
        case BackgroundType.GRADIENT:
          if (!GRADIENT_REGEX.test(data.background.value)) {
            errors.push('Gradient background must be a valid CSS gradient');
          }
          break;
        case BackgroundType.IMAGE:
          if (!URL_REGEX.test(data.background.value)) {
            errors.push('Image background must be a valid URL');
          }
          break;
      }
    }

    // Validate overlay if present
    if (data.background.overlay) {
      if (!data.background.overlay.colour) {
        errors.push('Overlay colour is required when overlay is specified');
      }
      if (typeof data.background.overlay.opacity !== 'number' || 
          data.background.overlay.opacity < 0 || 
          data.background.overlay.opacity > 1) {
        errors.push('Overlay opacity must be a number between 0 and 1');
      }
    }
  }

  // CTA buttons validation
  if (!data.ctaButtons || !Array.isArray(data.ctaButtons) || data.ctaButtons.length === 0) {
    errors.push('At least one CTA button is required');
  } else if (data.ctaButtons.length > 3) {
    errors.push('Maximum 3 CTA buttons allowed');
  } else {
    data.ctaButtons.forEach((button, index) => {
      if (!button.label || !button.label.trim()) {
        errors.push(`CTA button ${index + 1} label is required`);
      } else if (button.label.length > 50) {
        errors.push(`CTA button ${index + 1} label must be 50 characters or less`);
      }

      if (!button.url || !button.url.trim()) {
        errors.push(`CTA button ${index + 1} URL is required`);
      } else if (!URL_REGEX.test(button.url) && !button.url.startsWith('/')) {
        errors.push(`CTA button ${index + 1} URL must be a valid URL or relative path`);
      }

      if (button.variant && !Object.values(CTAVariant).includes(button.variant)) {
        errors.push(`CTA button ${index + 1} variant must be valid`);
      }
    });
  }

  // Date validation
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
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
  if (data.priority !== undefined) {
    if (typeof data.priority !== 'number' || data.priority < 1 || data.priority > 10) {
      errors.push('Priority must be a number between 1 and 10');
    }
  }

  // Template-specific validation
  switch (data.templateType) {
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

function validateGivingCampaignFields(data: BannerData, errors: string[]): void {
  if (data.donationGoal) {
    if (typeof data.donationGoal.target !== 'number' || data.donationGoal.target <= 0) {
      errors.push('Donation goal target must be a positive number');
    }
    
    if (typeof data.donationGoal.current !== 'number' || data.donationGoal.current < 0) {
      errors.push('Donation goal current amount must be a non-negative number');
    }
    
    if (data.donationGoal.current > data.donationGoal.target) {
      errors.push('Current donation amount cannot exceed target');
    }
    
    if (!data.donationGoal.currency || data.donationGoal.currency.length !== 3) {
      errors.push('Donation goal currency must be a valid 3-letter currency code');
    }
  }

  if (data.urgencyLevel && !Object.values(UrgencyLevel).includes(data.urgencyLevel)) {
    errors.push('Urgency level must be valid');
  }

  if (data.campaignEndDate) {
    const endDate = new Date(data.campaignEndDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Campaign end date must be a valid date');
    } else if (endDate <= new Date()) {
      errors.push('Campaign end date must be in the future');
    }
  }
}

function validatePartnershipCharterFields(data: BannerData, errors: string[]): void {
  if (data.charterType && !Object.values(CharterType).includes(data.charterType)) {
    errors.push('Charter type must be valid');
  }

  if (data.signatoriesCount !== undefined) {
    if (typeof data.signatoriesCount !== 'number' || data.signatoriesCount < 0) {
      errors.push('Signatories count must be a non-negative number');
    }
  }
}

function validateResourceProjectFields(data: BannerData, errors: string[]): void {
  if (data.resourceType && !Object.values(ResourceType).includes(data.resourceType)) {
    errors.push('Resource type must be valid');
  }

  if (data.downloadCount !== undefined) {
    if (typeof data.downloadCount !== 'number' || data.downloadCount < 0) {
      errors.push('Download count must be a non-negative number');
    }
  }

  if (data.fileType && data.fileType.length > 10) {
    errors.push('File type must be 10 characters or less');
  }

  if (data.lastUpdated) {
    const lastUpdated = new Date(data.lastUpdated);
    if (isNaN(lastUpdated.getTime())) {
      errors.push('Last updated date must be a valid date');
    }
  }
}

// Validate media assets
export function validateMediaAsset(asset: any): ValidationResult {
  const errors: string[] = [];

  if (!asset.url || !asset.url.trim()) {
    errors.push('Media asset URL is required');
  } else if (!URL_REGEX.test(asset.url)) {
    errors.push('Media asset URL must be valid');
  }

  if (!asset.alt || !asset.alt.trim()) {
    errors.push('Media asset alt text is required');
  }

  if (asset.width !== undefined && (typeof asset.width !== 'number' || asset.width <= 0)) {
    errors.push('Media asset width must be a positive number');
  }

  if (asset.height !== undefined && (typeof asset.height !== 'number' || asset.height <= 0)) {
    errors.push('Media asset height must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate file upload constraints
export function validateFileUpload(file: any, maxSize: number = 5 * 1024 * 1024): ValidationResult {
  const errors: string[] = [];

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Validate image files
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedImageTypes.includes(file.mimetype)) {
      errors.push('Image must be JPEG, PNG, WebP, or SVG format');
    }
  }

  // Validate video files
  if (file.mimetype && file.mimetype.startsWith('video/')) {
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedVideoTypes.includes(file.mimetype)) {
      errors.push('Video must be MP4, WebM, or OGG format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
