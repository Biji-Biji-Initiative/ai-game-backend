# OpenAPI Schema Standardization - Summary of Required Changes
1. In EVERY YAML file, replace 'success: boolean' with 'status: string'
2. Where API returns data arrays, wrap in object: 'data: array' → 'data: { users: array }'
3. Where API returns single objects, wrap in object with descriptive key: 'data: object' → 'data: { user: object }'
4. For auth.yaml: Rename 'token' to 'accessToken' in responses
5. For error responses in common.yaml: Change to 'status: string' (example: 'error')
6. After YAML updates: Run 'cd backend && npm run swagger:bundle'
7. Update ALL controllers to use 'status' instead of 'success'
8. Nest controller response data: res.json({ status: 'success', data: { users: results } })
9. For errors: res.status(404).json({ status: 'error', message: 'Not found' })
10. Files to update: auth.yaml, users.yaml, challenges.yaml, progress.yaml, system.yaml, adaptive.yaml, evaluations.yaml, focusAreas.yaml, personality.yaml, preferences.yaml, prompt.yaml, userJourney.yaml, and common.yaml
11. Delete empty file: prompts.yaml (contains only a space)
