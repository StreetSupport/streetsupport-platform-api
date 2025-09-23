import { Schema } from "mongoose";
import { ResourceType } from "./IBanner.js";

export interface IResourceFile {
  FileUrl?: string;
  ResourceType?: ResourceType;
  DownloadCount?: number;
  LastUpdated?: Date;
  FileSize?: string;
  FileType?: string;
}

export const ResourceFileSchema = new Schema<IResourceFile>({
  FileUrl: { type: String },
  ResourceType: { type: String, enum: Object.values(ResourceType) },
  DownloadCount: { type: Number, min: 0, default: 0 },
  LastUpdated: { type: Date },
  FileSize: { type: String },
  FileType: { type: String }
}, { _id: false });

// Supported file types for resource projects
export const SUPPORTED_RESOURCE_FILE_TYPES = {
  // Documents
  'application/pdf': { extension: 'PDF', description: 'PDF Document' },
  'application/msword': { extension: 'DOC', description: 'Word Document' },
  'application/vnd.ms-excel': { extension: 'XLS', description: 'Excel Spreadsheet' },
  'application/vnd.ms-powerpoint': { extension: 'PPT', description: 'PowerPoint Presentation' },
  
  // Audio & Video
  'audio/mpeg': { extension: 'MP3', description: 'MP3 Audio' },
  'video/mp4': { extension: 'MP4', description: 'MP4 Video' },
  
  // Archives
  'application/zip': { extension: 'ZIP', description: 'ZIP Archive' },
} as const;

export const RESOURCE_FILE_ACCEPT_STRING = Object.keys(SUPPORTED_RESOURCE_FILE_TYPES).join(',');

export const MAX_RESOURCE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getFileTypeFromMimeType(mimeType: string): string {
  const fileInfo = SUPPORTED_RESOURCE_FILE_TYPES[mimeType as keyof typeof SUPPORTED_RESOURCE_FILE_TYPES];
  return fileInfo?.extension || 'FILE';
}

export function isValidResourceFileType(mimeType: string): boolean {
  return mimeType in SUPPORTED_RESOURCE_FILE_TYPES;
}
