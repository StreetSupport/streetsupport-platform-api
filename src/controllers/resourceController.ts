import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendBadRequest, sendNotFound } from '../utils/apiResponses.js';
import Resource from '../models/resourceModel.js';
import { validateResource } from '../schemas/resourceSchema.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';

// Get all resources with optional search
export const getResources = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  
  const query: any = {};
  
  // Apply search filter across multiple fields
  if (search && typeof search === 'string') {
    const searchTerm = search.trim();

    query.$or = [
      { Key: { $regex: searchTerm, $options: 'i' } },
      { Name: { $regex: searchTerm, $options: 'i' } },
      { Header: { $regex: searchTerm, $options: 'i' } },
      { ShortDescription: { $regex: searchTerm, $options: 'i' } },
      { Body: { $regex: searchTerm, $options: 'i' } },
      { 'LinkList.Name': { $regex: searchTerm, $options: 'i' } },
      { 'LinkList.Description': { $regex: searchTerm, $options: 'i' } },
      { 'LinkList.Links.Title': { $regex: searchTerm, $options: 'i' } },
      { 'LinkList.Links.Link': { $regex: searchTerm, $options: 'i' } }
    ];
  }
  
  const resources = await Resource.find(query)
    .sort({ DocumentModifiedDate: -1 })
    .lean();
    
  return sendSuccess(res, resources);
});

// Get single resource by key
export const getResourceByKey = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  const resource = await Resource.findOne({ Key: key }).lean();
  
  if (!resource) {
    return sendNotFound(res, 'Resource not found');
  }
  
  return sendSuccess(res, resource);
});

// Update existing resource
export const updateResource = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  // Find existing resource
  const existingResource = await Resource.findOne({ Key: key });
  
  if (!existingResource) {
    return sendNotFound(res, 'Resource not found');
  }

  // Process file replacements - extract old file URLs for cleanup
  const oldFileUrls: string[] = [];
  
  // Collect all existing file URLs from the resource
  if (existingResource.LinkList) {
    existingResource.LinkList.forEach((linkList) => {
      if (linkList.Links && Array.isArray(linkList.Links)) {
        linkList.Links.forEach((item) => {
          if (item.Link && item.Link.startsWith('http')) {
            oldFileUrls.push(item.Link);
          }
        });
      }
    });
  }

  // Process form data and merge uploaded files
  const processedData = processResourceFormData(req.body);

  // Validate the processed data
  const validation = validateResource(processedData);
  
  if (!validation.success) {
    const errorMessages = validation.errors?.map(err => err.message).join(', ') || 'Validation failed';
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Update resource
  const updateData = {
    ...validation.data,
    DocumentModifiedDate: new Date(),
  };

  const updatedResource = await Resource.findOneAndUpdate(
    { Key: key },
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedResource) {
    return sendNotFound(res, 'Resource not found');
  }

  // Clean up old files that are no longer in the updated resource (non-blocking)
  if (oldFileUrls.length > 0 && updatedResource.LinkList) {
    const newFileUrls = new Set<string>();
    updatedResource.LinkList.forEach((linkList) => {
      if (linkList.Links && Array.isArray(linkList.Links)) {
        linkList.Links.forEach((item) => {
          if (item.Link && item.Link.startsWith('http')) {
            newFileUrls.add(item.Link);
          }
        });
      }
    });
    
    // Only delete files that are no longer referenced
    const filesToDelete = oldFileUrls.filter(url => !newFileUrls.has(url));
    if (filesToDelete.length > 0) {
      Promise.all(filesToDelete.map(url => deleteFile(url)))
        .catch(error => console.error('Error cleaning up old files:', error));
    }
  }

  return sendSuccess(res, updatedResource);
});

// Helper function to process form data and merge uploaded files
function processResourceFormData(body: any): any {
  const data = { ...body };
  
  // Parse LinkList if it's a string
  if (typeof data.LinkList === 'string') {
    try {
      data.LinkList = JSON.parse(data.LinkList);
    } catch (error) {
      console.error('Error parsing LinkList:', error);
      data.LinkList = [];
    }
  }
  
  // Process LinkList to merge uploaded file URLs
  if (data.LinkList && Array.isArray(data.LinkList)) {
    data.LinkList = data.LinkList.map((linkList: any, listIndex: number) => {
      if (linkList.Links && Array.isArray(linkList.Links)) {
        linkList.Links = linkList.Links.map((item: any, itemIndex: number) => {
          const fieldName = `newfile_LinkList_${listIndex}_Links_${itemIndex}`;
          const uploadedFileUrl = data[fieldName];
          
          // If file was uploaded for this item, use the uploaded URL
          if (uploadedFileUrl) {
            return {
              ...item,
              Link: uploadedFileUrl
            };
          }
          
          return item;
        });
      }
      
      return linkList;
    });
  }
  
  // Remove file field entries from data (they're already merged into LinkList)
  Object.keys(data).forEach(key => {
    if (key.startsWith('newfile_LinkList_')) {
      delete data[key];
    }
  });
  
  return data;
}
