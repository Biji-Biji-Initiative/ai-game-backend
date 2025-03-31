# API Tester UI Enhancement Tickets

## Completed Tickets (Phase 1)

### TESTER-UI-1: Integrate and Visualize Correlated Backend Logs ✅
- Add a "Backend Logs" tab/panel in the API Tester UI
- Show logs correlated with the current API test run (via correlation ID)
- Allow auto-refresh toggling
- Enhance log rendering to show metadata clearly
- Include "View Backend Logs" button in step results
- **Status**: Completed

### TESTER-UI-2: Visualize Domain Events in Logs ✅
- Parse and highlight domain events in the logs
- Add proper formatting for different event types
- Make domain events expandable/collapsible
- Include filters specifically for domain events
- **Status**: Completed

### TESTER-UI-3: Enhance Variable Management UI ✅
- Improve UX for variable extraction
- Add drag and drop functionality for variable references
- Create dynamic preview for current variable values
- Show where each variable is being used
- **Status**: Completed

### TESTER-UI-4: Status Panel Integration ✅
- Redesign the header with status indicators
- Show environment and server status information
- Add visual indicators for connectivity
- Make panel components collapsible on mobile
- **Status**: Completed

### TESTER-UI-5: Improve Response Viewer Interactivity ✅
- Add collapsible sections for large JSON/XML responses
- Implement search functionality within responses
- Add syntax highlighting options
- Enhance rendering performance for large responses
- Create keyboard shortcuts for navigation
- **Status**: Completed

## Phase 2: Deep Interaction Visualization & Gameplay Simulation

### TESTER-UI-6: Domain State Snapshot Viewer ✅
- Add a new panel/tab to view domain entity state before and after step execution
- Create backend endpoints to fetch entity state by type and ID
- Allow selection of entities to snapshot based on step parameters
- Implement side-by-side or diff view of state changes
- **Priority**: High
- **Status**: Completed

### TESTER-UI-7: AI Content Diff Viewer
- Enhance ResponseViewer to highlight AI-generated content differences
- Display correlations between user input and AI feedback/responses
- Implement visual diff for original vs AI-generated content
- **Priority**: Medium
- **Dependencies**: TESTER-UI-1
- **Status**: Not Started

### TESTER-UI-8: Automated Flow Runner
- Add "Run Flow" button to execute all steps in a flow sequentially
- Automatically pass variables between steps using VariableManager
- Display overall flow success/failure status
- Show incremental results as steps complete
- Provide option to stop on first failure
- **Priority**: Medium
- **Dependencies**: TESTER-UI-4
- **Status**: Not Started

### TESTER-UI-9: Scenario Management (Save/Load Flows)
- Allow saving flow state (inputs, variables) as named scenarios
- Implement load functionality to restore saved scenarios
- Use localStorage for persistence
- Add export/import capabilities for sharing scenarios
- **Priority**: Medium
- **Status**: Not Started

### TESTER-UI-10: Enhanced System Status Visualization
- Make header status indicators more informative with DB/AI status icons
- Create detailed status modal with dependency health information
- Add visual cues for degraded services
- Include timestamp for status checks
- **Priority**: Medium
- **Dependencies**: TESTER-UI-3
- **Status**: Not Started

### TESTER-UI-11: Basic Response Assertions
- Add UI for defining response assertions (status, headers, body)
- Implement evaluation of assertions after request completion
- Display pass/fail indicators for assertions
- Support JSONPath for body assertions
- **Priority**: Low
- **Status**: Not Started
