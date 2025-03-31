# Changelog

## [Unreleased]

### Added
- **UITEST-1**: Dynamic OpenAPI schema loading 
  - Created OpenApiService to fetch and process OpenAPI schemas
  - Added fallback to local endpoints.json if Swagger endpoint is not available
  - Improved error handling for schema loading

- **UITEST-12**: Scenario Builder implementation
  - Created ScenarioBuilder component for creating and running multi-step API sequences
  - Added support for storing scenarios in localStorage
  - Implemented sequential execution with delay controls
  - Added visualization of success/failure for each step

- **UITEST-16**: Endpoint grouping by domain tags
  - Enhanced EndpointList component to group endpoints by category
  - Added collapsible/expandable sections for each category
  - Improved filtering and organization of endpoints

- **UITEST-11**: Enhanced form input generation
  - Improved parameter handling with type-specific inputs
  - Added support for enum dropdowns, number inputs, and boolean checkboxes
  - Added descriptions and required field indicators
  - Improved JSON example generation for request bodies

- **UITEST-17**: Authentication & JWT token handling
  - Created AuthService for managing JWT tokens
  - Added automatic token storage from login responses
  - Implemented automatic inclusion of Authorization headers
  - Added authentication status display and logout button

### Changed
- Improved UI layout with tabbed interface
- Enhanced error handling and loading states
- Updated CSS styles for better usability
- Added support for environment switching via Base URL input

### Security
- Used sessionStorage instead of localStorage for JWT tokens to mitigate XSS risks
- Added token expiration checking

## [1.0.0] - Initial Release

- Basic API testing functionality
- Static endpoints.json configuration
- Simple parameter handling 
