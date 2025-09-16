import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { Request, Response, NextFunction } from 'express';
import { validateFileUpload } from '../utils/bannerValidation.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'banner-assets';

let blobServiceClient: BlobServiceClient | null = null;

if (AZURE_STORAGE_CONNECTION_STRING) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  } catch (error) {
    console.warn('Azure Blob Storage not configured, falling back to local storage');
  }
}

// Multer configuration for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/ogg'
    ];

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
  const blobName = `banners/${fileName}`;

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
  const uploadsDir = path.join(process.cwd(), 'uploads', 'banners');
  const fileExtension = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadsDir, fileName);

  // Create directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(filePath, file.buffer);

  // Return relative URL
  return `/uploads/banners/${fileName}`;
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
        // Validate file
        const validation = validateFileUpload(file);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'File validation failed',
            errors: validation.errors
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
              url: fileUrl,
              alt: file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype
            };

            // Add dimensions for images
            if (file.mimetype.startsWith('image/')) {
              // You could use sharp or similar library to get dimensions
              // For now, we'll let the frontend handle this
            }

            // Store in appropriate field
            if (fieldName === 'logo') {
              uploadedAssets.logo = asset;
            } else if (fieldName === 'image' || fieldName === 'backgroundImage') {
              uploadedAssets.image = asset;
            } else if (fieldName === 'video') {
              uploadedAssets.video = {
                ...asset,
                title: file.originalname.replace(/\.[^/.]+$/, ''),
                poster: '', // Could be generated from video
                captions: ''
              };
            } else if (fieldName === 'partnerLogos') {
              if (!uploadedAssets.partnerLogos) {
                uploadedAssets.partnerLogos = [];
              }
              uploadedAssets.partnerLogos.push(asset);
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

// Middleware that handles multiple file fields
export const uploadMiddleware = [
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'partnerLogos', maxCount: 10 }
  ]),
  processUploads
];

// Single file upload middleware
export const uploadSingle = (fieldName: string) => [
  upload.single(fieldName),
  processUploads
];

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
    } else if (fileUrl.startsWith('/uploads/')) {
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
