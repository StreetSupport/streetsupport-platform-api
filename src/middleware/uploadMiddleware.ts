import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import type { NextFunction, Request, Response } from 'express';
import { getFileTypeFromMimeType, isValidResourceFileType, SUPPORTED_RESOURCE_FILE_TYPES } from '@/types/IResourceFile.js';
import { validateBannerPreUpload } from '../schemas/bannerSchema.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'banners';

let blobServiceClient: BlobServiceClient | null = null;
if (AZURE_STORAGE_CONNECTION_STRING) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    console.log('Azure Blob Storage configured successfully');
  } catch (error) {
    console.warn('Failed to initialize Azure Blob Storage:', error);
    console.warn('Falling back to local storage');
  }
} else {
  console.log('Azure Storage connection string not provided, using local storage');
}

// Multer configuration for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Combine banner image types with resource file types
    const bannerImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const resourceFileTypes = Object.keys(SUPPORTED_RESOURCE_FILE_TYPES);
    const allowedMimeTypes = [...new Set([...bannerImageTypes, ...resourceFileTypes])];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Upload to Azure Blob Storage
async function uploadToAzure(file: Express.Multer.File): Promise<string> {
  if (!blobServiceClient) {
    throw new Error('Azure Blob Storage not configured');
  }

  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  
  // Ensure container exists
  await containerClient.createIfNotExists({
    access: 'blob' // Public read access
  });

  // Generate unique filename
  const fileExtension = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExtension}`;
  const blobName = fileName;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Upload file
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    },
    metadata: {
      originalName: file.originalname,
      uploadedAt: new Date().toISOString()
    }
  });

  return blockBlobClient.url;
}

// Fallback: Save to local uploads directory
function saveToLocal(file: Express.Multer.File): string {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'banners');
  const fileExtension = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadsDir, fileName);

  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(filePath, file.buffer);

  // Return relative URL
  return `/public/uploads/banners/${fileName}`;
}

// Process uploaded files and add URLs to request body
async function processUploads(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
    
    if (!files) {
      return next();
    }

    const uploadPromises: Promise<void>[] = [];
    const uploadedAssets: { [key: string]: any } = {};

    // Handle different file field structures
    const fileFields = Array.isArray(files) ? { files } : files;

    for (const [fieldName, fileArray] of Object.entries(fileFields)) {
      if (!Array.isArray(fileArray)) continue;

      for (const file of fileArray) {
        // Basic file validation (detailed validation handled by Zod schemas)
        if (!file || file.size === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid file upload'
          });
        }

        // Upload file
        const uploadPromise = (async () => {
          try {
            let fileUrl: string;
            
            if (blobServiceClient) {
              fileUrl = await uploadToAzure(file);
            } else {
              fileUrl = saveToLocal(file);
            }

            // Create asset object
            const asset = {
              Url: fileUrl,
              Alt: file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
              Filename: file.originalname,
              Size: file.size,
              MimeType: file.mimetype
            };

            // Add dimensions for images
            if (file.mimetype.startsWith('image/')) {
              // You could use sharp or similar library to get dimensions
              // For now, we'll let the frontend handle this
            }

            // Store in appropriate field
            // TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
            if (fieldName === 'newfile_Logo' || fieldName === 'newfile_BackgroundImage' || fieldName === 'newfile_MainImage' /* || fieldName === 'newfile_AccentGraphic' */) {
              uploadedAssets[fieldName] = asset;
            } else if (fieldName === 'newfile_PartnerLogos') {
              if (!uploadedAssets[fieldName]) {
                uploadedAssets[fieldName] = [];
              }
              uploadedAssets[fieldName].push(asset);
            } else if (fieldName === 'newfile_ResourceFile') {
              // Validate resource file type
              if (!isValidResourceFileType(file.mimetype)) {
                throw new Error(`Unsupported resource file type: ${file.mimetype}. Please upload a valid resource file.`);
              }
              
              // Store the uploaded file URL - metadata will be merged in processMediaFields
              uploadedAssets[fieldName] = {
                FileUrl: fileUrl,
              };
            }
          } catch (error: any) {
            console.error('Upload error:', error);
            throw new Error(`Failed to upload ${file.originalname}: ${error.message}`);
          }
        })();

        uploadPromises.push(uploadPromise);
      }
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Merge uploaded assets into request body
    req.body = {
      ...req.body,
      ...uploadedAssets
    };

    next();
  } catch (error: any) {
    console.error('Upload processing error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
}

// Combined middleware for validation and upload
const handleMultipartData = upload.fields([
  { name: 'newfile_Logo', maxCount: 1 },
  { name: 'newfile_BackgroundImage', maxCount: 1 },
  { name: 'newfile_MainImage', maxCount: 1 },
  // TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
  // { name: 'newfile_AccentGraphic', maxCount: 1 },
  { name: 'newfile_PartnerLogos', maxCount: 5 },
  { name: 'newfile_ResourceFile', maxCount: 1 }
]);

export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  handleMultipartData(req, res, (err) => {
    if (err) {
      // Handle Multer errors (e.g., file size limit)
      return res.status(400).json({ success: false, message: 'File upload error', error: err.message });
    }

    // 1. Perform Pre-upload validation on req.body (now populated by Multer).
    const validation = validateBannerPreUpload(req.body);
    if (!validation.success) {
      // Stop the process if validation fails before uploading files.
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Attach the validated data for the next steps.
    req.preValidatedData = validation.data;

    // 2. Proceed to process and upload files.
    processUploads(req, res, next);
  });
};

// Single file upload middleware
export const uploadSingle = (fieldName: string) => [
  upload.single(fieldName),
  processUploads
];

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop() || '';
}

// Delete file from storage
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    if (blobServiceClient && fileUrl.includes('blob.core.windows.net')) {
      // Extract blob name from URL
      const urlParts = fileUrl.split('/');
      const blobName = urlParts.slice(-2).join('/'); // Get last two parts (folder/filename)
      
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.deleteIfExists();
    } else if (fileUrl.startsWith('/public/uploads/')) {
      // Local file deletion
      const fs = require('fs');
      const filePath = path.join(process.cwd(), fileUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('File deletion error:', error);
    // Don't throw error - file deletion failure shouldn't break the application
  }
}


export default uploadMiddleware;
