/**
 * Postcode validation utilities using postcodes.io API
 */

export interface PostcodeData {
  postcode: string;
  quality: number;
  eastings: number;
  northings: number;
  country: string;
  nhs_ha: string;
  longitude: number;
  latitude: number;
  european_electoral_region: string;
  primary_care_trust: string;
  region: string;
  lsoa: string;
  msoa: string;
  incode: string;
  outcode: string;
  parliamentary_constituency: string;
  admin_district: string;
  parish: string;
  admin_county: string;
  admin_ward: string;
  ced: string;
  ccg: string;
  nuts: string;
  codes: {
    admin_district: string;
    admin_county: string;
    admin_ward: string;
    parish: string;
    parliamentary_constituency: string;
    ccg: string;
    ccg_id: string;
    ced: string;
    nuts: string;
    lsoa: string;
    msoa: string;
    lau2: string;
  };
}

export interface PostcodeResponse {
  status: number;
  result: PostcodeData;
}

/**
 * Validates a UK postcode using the postcodes.io API
 * @param postcode - The postcode to validate
 * @returns Promise<PostcodeData | null> - Returns postcode data if valid, null if invalid
 */
export async function validatePostcode(postcode: string): Promise<PostcodeData | null> {
  try {
    // Clean the postcode (remove extra spaces, convert to uppercase)
    const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, ' ');
    
    if (!cleanPostcode) {
      return null;
    }

    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`);
    
    if (response.status === 404) {
      // Postcode not found
      return null;
    }
    
    if (!response.ok) {
      // API error
      console.error('Postcode validation API error:', response.status, response.statusText);
      return null;
    }

    const data: PostcodeResponse = await response.json();
    return data.result;
    
  } catch (error) {
    console.error('Error validating postcode:', error);
    return null;
  }
}

/**
 * Basic UK postcode format validation (regex-based, doesn't check if postcode exists)
 * @param postcode - The postcode to validate
 * @returns boolean - True if format is valid
 */
export function isValidPostcodeFormat(postcode: string): boolean {
  // UK postcode regex pattern
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim());
}

/**
 * Zod custom validation function for postcodes
 * Can be used in Zod schemas for async validation
 * @param postcode - The postcode to validate
 * @returns Promise<string> - Returns the postcode if valid, throws error if invalid
 */
export async function zodPostcodeValidation(postcode: string): Promise<string> {
  // First check basic format
  if (!isValidPostcodeFormat(postcode)) {
    throw new Error('Invalid postcode format');
  }
  
  // Then validate with API
  const result = await validatePostcode(postcode);
  if (!result) {
    throw new Error('Postcode not found');
  }
  
  return postcode;
}
