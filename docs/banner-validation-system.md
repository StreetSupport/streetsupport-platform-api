# Banner Two-Phase Validation System

## Overview

The banner system implements a two-phase validation approach to prevent orphaned files in blob storage when validation fails. This system validates non-file data before uploading files, and cleans up uploaded files if final validation fails.

## Architecture

### Phase 1: Pre-Upload Validation
- **Purpose**: Validate all non-file fields before any files are uploaded to blob storage
- **Schema**: `BannerPreUploadSchemaCore` - excludes file-related fields
- **Middleware**: `preUploadValidationMiddleware`
- **Benefits**: Prevents unnecessary file uploads, reduces storage costs

### Phase 2: Post-Upload Validation & Cleanup
- **Purpose**: Full validation after file upload, with cleanup on failure
- **Schema**: `BannerSchema` - complete validation including file fields
- **Cleanup**: `cleanupUploadedFiles()` removes uploaded files if validation fails
- **Benefits**: Prevents orphaned files, maintains storage integrity

## Middleware Chain

```
Request → Authentication → Pre-Upload Validation → File Upload → Final Validation → Database Operation
```

### Route Configuration
```typescript
router.post('/', bannersAuth, preUploadValidationMiddleware, uploadMiddleware, createBanner);
router.put('/:id', bannersAuth, preUploadValidationMiddleware, uploadMiddleware, updateBanner);
```

## Validation Schemas

### Pre-Upload Schema (`BannerPreUploadSchemaCore`)
Validates these fields before file upload:
- Core content: Title, Subtitle, Description, TemplateType
- Actions: CtaButtons (structure and limits)
- Styling: Background (non-file properties), TextColour, LayoutStyle
- Scheduling: ShowDates, StartDate, EndDate, BadgeText
- Template-specific: GivingCampaign, PartnershipCharter, ResourceProject (non-file parts)
- CMS metadata: IsActive, LocationSlug, Priority

**Excluded from pre-upload validation:**
- Logo, BackgroundImage, SplitImage, AccentGraphic
- PartnerLogos array
- ResourceFile

### Full Schema (`BannerSchema`)
Complete validation including all file-related fields after upload.

## Error Handling

### Pre-Upload Validation Failure
```json
{
  "success": false,
  "message": "Validation failed before file upload",
  "errors": [
    {
      "path": "Title",
      "message": "Title is required",
      "code": "invalid_type"
    }
  ]
}
```
**Result**: No files uploaded, immediate error response.

### Post-Upload Validation Failure
```json
{
  "success": false,
  "message": "Validation failed after file upload",
  "errors": [
    {
      "path": "GivingCampaign.DonationGoal.Target",
      "message": "Target must be greater than 0",
      "code": "too_small"
    }
  ]
}
```
**Result**: Uploaded files are cleaned up automatically.

## File Cleanup Functions

### `cleanupUploadedFiles(processedData)`
- **Purpose**: Remove all uploaded files when validation fails
- **Usage**: Called automatically when post-upload validation fails
- **Scope**: Removes all files from the current upload

### `cleanupUnusedFiles(oldBanner, newBanner)`
- **Purpose**: Remove files that are no longer used after update
- **Usage**: Called automatically after successful banner update
- **Scope**: Removes only files that were replaced

## Implementation Examples

### Creating a Banner
```typescript
// 1. Pre-upload validation runs automatically
// 2. If valid, files are uploaded to blob storage
// 3. Full validation runs with file data
// 4. If validation fails, uploaded files are cleaned up
// 5. If successful, banner is saved to database

const result = await fetch('/api/banners', {
  method: 'POST',
  body: formData // Contains both file and non-file data
});
```

### Validation Flow
```typescript
// Pre-upload validation (middleware)
const preValidation = validateBannerPreUpload(nonFileData);
if (!preValidation.success) {
  return res.status(400).json({ errors: preValidation.errors });
}

// File upload happens here (uploadMiddleware)

// Full validation (controller)
const fullValidation = validateBanner(processedDataWithFiles);
if (!fullValidation.success) {
  await cleanupUploadedFiles(processedDataWithFiles);
  return res.status(400).json({ errors: fullValidation.errors });
}
```

## Benefits

1. **Storage Efficiency**: No orphaned files in blob storage
2. **Cost Reduction**: Prevents unnecessary storage costs
3. **Fast Failure**: Quick response for basic validation errors
4. **Data Integrity**: Ensures consistent state between database and storage
5. **Graceful Degradation**: Cleanup failures don't break the application

## Testing

### Pre-Upload Validation Tests
```typescript
test('should validate non-file fields before upload', () => {
  const validData = {
    Title: 'Test Banner',
    TemplateType: BannerTemplateType.GIVING_CAMPAIGN,
    // ... other non-file fields
  };
  
  const result = validateBannerPreUpload(validData);
  expect(result.success).toBe(true);
});
```

### File Cleanup Tests
```typescript
test('should identify files for cleanup', () => {
  const processedData = {
    Logo: { Url: 'https://example.com/logo.jpg' },
    // ... other file fields
  };
  
  const urls = extractFileUrls(processedData);
  expect(urls).toContain('https://example.com/logo.jpg');
});
```

## Monitoring

### Logs to Monitor
- Pre-upload validation failures: `"Validation failed before file upload"`
- Post-upload validation failures: `"Validation failed after file upload"`
- File cleanup success: `"Cleaned up uploaded file after validation failure"`
- File cleanup errors: `"Failed to delete uploaded file"`

### Metrics to Track
- Pre-upload validation failure rate
- Post-upload validation failure rate
- File cleanup success rate
- Storage usage trends

## Troubleshooting

### Common Issues

1. **Files not being cleaned up**
   - Check blob storage permissions
   - Verify `deleteFile` function implementation
   - Review cleanup function logs

2. **Pre-upload validation too strict**
   - Review `BannerPreUploadSchemaCore` schema
   - Ensure all required fields are included in pre-validation

3. **Performance issues**
   - Monitor file upload sizes
   - Consider implementing file size limits in pre-validation
   - Review cleanup function performance

### Debug Mode
Enable debug logging to trace validation flow:
```typescript
console.log('Pre-upload validation:', preValidation);
console.log('File upload result:', uploadResult);
console.log('Full validation:', fullValidation);
```

## Future Enhancements

1. **Batch File Operations**: Optimize cleanup for multiple files
2. **Retry Logic**: Implement retry for failed cleanup operations
3. **Metrics Dashboard**: Real-time monitoring of validation and cleanup
4. **File Versioning**: Keep file versions for rollback scenarios
5. **Async Cleanup**: Move cleanup to background jobs for better performance
