# OpenAPI Schema Standardization Plan

## Key Changes Needed

1. Change all `success: boolean` to `status: string`
2. Nest data objects under a key within `data: { key: ... }`
3. Standardize error responses with `status: "error"`
4. Use descriptive keys in the data object (users, challenges, etc.)

## Files to Update

- Path YAML files (12 files)
- Common responses file (1 file)

## Process Outline

1. Copy the updated version of each file from the agent responses
2. Run npm run swagger:bundle
3. Update controllers to match new format
4. Test endpoints

## Controller Updates Required

All controllers must be updated to return responses in the new format:

- Change from `success: true, data: result` to `status: 'success', data: { key: result }`
- Change from `success: false, message: '...'` to `status: 'error', message: '...'`
