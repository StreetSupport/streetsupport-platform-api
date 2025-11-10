import { z } from 'zod';
import { LinkListType } from '../types/resources/ILinkList.js';
import { preprocessJSON, preprocessNumber } from './validationHelpers.js';

// KeyValue Schema for link list items
export const KeyValueSchema = z.object({
  Key: z.string().min(1, 'Link name is required'),
  Value: z.string().min(1, 'Link URL is required')
});

// LinkList Schema
export const LinkListSchema = z.object({
  Name: z.string().min(1, 'Link list name is required'),
  Description: z.string().optional().default(''),
  Type: z.nativeEnum(LinkListType, {
    message: 'Invalid link list type'
  }),
  Priority: z.preprocess(
    preprocessNumber,
    z.number().min(1, 'Priority must be at least 1').max(10, 'Priority must be at most 10')
  ),
  Links: z.array(KeyValueSchema).min(1, 'At least one link is required')
});

// Main Resource Schema for API validation
export const ResourceSchema = z.object({
  Key: z.string()
    .min(1, 'Resource key is required'),
  Name: z.string().min(1, 'Resource name is required'),
  Header: z.string().min(1, 'Resource header is required'),
  ShortDescription: z.string().min(1, 'Short description is required'),
  Body: z.string().min(1, 'Resource body content is required'),
  LinkList: z.preprocess(
    preprocessJSON,
    z.array(LinkListSchema).default([])
  ),
  CreatedBy: z.string().optional()
});

// Validation function
export function validateResource(data: unknown) {
  const result = ResourceSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}
