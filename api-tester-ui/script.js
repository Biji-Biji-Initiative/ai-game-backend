document.addEventListener('DOMContentLoaded', () => {
    // Initialize API sections
    const apiSections = document.getElementById('api-sections');
    
    // Load API endpoints from the API_ENDPOINTS object
    function initializeApiSections() {
        if (!apiSections || !API_ENDPOINTS) {
            console.error('API sections element or API_ENDPOINTS not found');
            return;
        }
        
        // Clear existing content
        apiSections.innerHTML = '';
        
        // Add each section
        Object.keys(API_ENDPOINTS).forEach(key => {
            const sectionData = API_ENDPOINTS[key];
            const section = createApiSection(sectionData.section, sectionData.endpoints);
            apiSections.appendChild(section);
        });
    }
    
    // Create a section element with its endpoints
    function createApiSection(sectionInfo, endpoints) {
        const section = document.createElement('div');
        section.className = 'api-section';
        section.id = `section-${sectionInfo.id}`;
        
        const header = document.createElement('h2');
        header.className = 'section-header';
        header.textContent = sectionInfo.title;
        section.appendChild(header);
        
        const endpointsContainer = document.createElement('div');
        endpointsContainer.className = 'endpoints-container';
        
        endpoints.forEach(endpoint => {
            const endpointElement = createEndpoint(endpoint);
            endpointsContainer.appendChild(endpointElement);
        });
        
        section.appendChild(endpointsContainer);
        return section;
    }
    
    // Create an endpoint element with its fields
    function createEndpoint(endpoint) {
        const endpointEl = document.createElement('div');
        endpointEl.className = 'endpoint';
        endpointEl.id = `endpoint-${endpoint.id}`;
        
        // Add title
        const title = document.createElement('h3');
        title.className = 'endpoint-title';
        title.textContent = endpoint.name;
        endpointEl.appendChild(title);
        
        // Add path and method
        if (endpoint.path) {
            const pathMethod = document.createElement('div');
            pathMethod.className = 'endpoint-path-method';
            pathMethod.innerHTML = `<span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span> <span class="path">${endpoint.path}</span>`;
            endpointEl.appendChild(pathMethod);
        }
        
        // Add description if available
        if (endpoint.description) {
            const desc = document.createElement('div');
            desc.className = 'endpoint-description';
            desc.textContent = endpoint.description;
            endpointEl.appendChild(desc);
        }
        
        // Add form
        const form = document.createElement('form');
        form.className = 'endpoint-form';
        form.id = `form-${endpoint.id}`;
        
        // Add fields
        if (endpoint.fields && endpoint.fields.length > 0) {
            const fieldsContainer = document.createElement('div');
            fieldsContainer.className = 'fields-container';
            
            endpoint.fields.forEach(field => {
                const fieldContainer = document.createElement('div');
                fieldContainer.className = 'field-container';
                
                const label = document.createElement('label');
                label.htmlFor = `${endpoint.id}-${field.id}`;
                label.textContent = field.label;
                fieldContainer.appendChild(label);
                
                let input;
                if (field.type === 'textarea' || field.type === 'json') {
                    input = document.createElement('textarea');
                    input.rows = field.rows || 3;
                } else if (field.type === 'select') {
                    input = document.createElement('select');
                    if (field.options && field.options.length > 0) {
                        field.options.forEach(option => {
                            const optionEl = document.createElement('option');
                            optionEl.value = option.value;
                            optionEl.textContent = option.label;
                            input.appendChild(optionEl);
                        });
                    }
                    if (field.defaultValue) {
                        input.value = field.defaultValue;
                    }
                } else {
                    input = document.createElement('input');
                    input.type = field.type;
                }
                
                input.id = `${endpoint.id}-${field.id}`;
                input.name = field.id;
                input.placeholder = field.placeholder || '';
                if (field.defaultValue && field.type !== 'select') {
                    input.value = field.defaultValue;
                }
                
                fieldContainer.appendChild(input);
                fieldsContainer.appendChild(fieldContainer);
            });
            
            form.appendChild(fieldsContainer);
        }
        
        // Add execute button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'btn-execute';
        submitBtn.textContent = 'Execute';
        submitBtn.id = `btn-${endpoint.id}`;
        submitBtn.addEventListener('click', () => executeEndpoint(endpoint));
        
        form.appendChild(submitBtn);
        endpointEl.appendChild(form);
        
        return endpointEl;
    }
    
    // Execute an API endpoint
    function executeEndpoint(endpoint) {
        // Get form values
        const form = document.getElementById(`form-${endpoint.id}`);
        const formData = new FormData(form);
        
        const body = {};
        let path = endpoint.path;
        
        // Special handling for path parameters and build body
        formData.forEach((value, key) => {
            if (path && path.includes(`:${key}`)) {
                // Replace path parameter
                path = path.replace(`:${key}`, encodeURIComponent(value));
            } else if (key.endsWith('Body')) {
                // Parse JSON body
                try {
                    body[key.replace('Body', '')] = JSON.parse(value);
                } catch (e) {
                    displayStatus(`Invalid JSON in ${key}`, true);
                    return;
                }
            } else {
                // Add to body
                body[key] = value;
            }
        });
        
        // Special handling for specific endpoints
        if (endpoint.id === 'createLoginUser') {
            // Handle the special createOrLoginUser endpoint
            const email = document.getElementById(`${endpoint.id}-email`).value;
            const password = document.getElementById(`${endpoint.id}-password`).value;
            const fullName = document.getElementById(`${endpoint.id}-fullName`).value;
            
            createOrLoginUser(email, password, fullName);
            return;
        }
        
        // Make API call
        makeApiCall(endpoint.method, path, Object.keys(body).length > 0 ? body : null);
    }
    
    // Initialize API sections
    initializeApiSections();
    
    const responseOutput = document.getElementById('raw-output');
    const statusMessage = document.getElementById('status-message');
    
    // User status elements
    const userStatusElement = document.getElementById('user-status');
    const currentUserEmailElement = document.getElementById('current-user-email');
    
    // Current authenticated user info
    let currentUser = null;
    let authToken = null;

    // --- Helper Functions ---

    function displayResponse(data) {
        responseOutput.textContent = JSON.stringify(data, null, 2);
    }

    function displayStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'error' : 'success';
    }

    function clearResponse() {
        responseOutput.textContent = 'Making request...';
        statusMessage.textContent = '';
        statusMessage.className = '';
    }
    
    // Function to update the UI with user status
    function updateUserStatus() {
        if (currentUser) {
            userStatusElement.textContent = 'Logged in';
            userStatusElement.className = 'logged-in';
            currentUserEmailElement.textContent = currentUser.email;
        } else {
            userStatusElement.textContent = 'Not logged in';
            userStatusElement.className = '';
            currentUserEmailElement.textContent = 'None';
        }
    }

    // Function to populate email fields throughout the UI
    function populateEmailFields(email) {
        if (!email) return;
        
        // Challenges
        document.getElementById('gen-challenge-email').value = email;
        document.getElementById('submit-user-email').value = email;
        document.getElementById('get-challenge-history-email').value = email;
        
        // Focus Areas
        document.getElementById('fa-get-email').value = email;
        document.getElementById('fa-set-email').value = email;
        document.getElementById('fa-rec-email').value = email;
        
        // Evaluations
        document.getElementById('eval-user-id').value = email;
        
        // User Journey
        document.getElementById('journey-user-email').value = email;
        document.getElementById('journey-activity-email').value = email;
        
        // Add a message about populating
        displayStatus(`Email fields populated with: ${email}`, false);
    }

    // Function to populate challenge ID fields
    function populateChallengeIdFields(challengeId) {
        if (!challengeId) return;
        
        document.getElementById('submit-challenge-id').value = challengeId;
        document.getElementById('get-challenge-id').value = challengeId;
        document.getElementById('progress-challenge-id').value = challengeId;
        document.getElementById('eval-challenge-id').value = challengeId;
        
        // If there's a complete-challenge-body input, update the JSON in it
        const completeBody = document.getElementById('complete-challenge-body');
        if (completeBody) {
            try {
                let bodyObj = JSON.parse(completeBody.value || '{"score": 85, "completionTime": 300}');
                bodyObj.challengeId = challengeId;
                completeBody.value = JSON.stringify(bodyObj, null, 2);
            } catch (e) {
                // If parsing fails, create a new object
                completeBody.value = JSON.stringify({
                    challengeId: challengeId,
                    score: 85,
                    completionTime: 300
                }, null, 2);
            }
        }
        
        // Optionally adjust difficulty body 
        const adjustBody = document.getElementById('adjust-difficulty-body');
        if (adjustBody) {
            try {
                let bodyObj = JSON.parse(adjustBody.value || '{"score": 85}');
                bodyObj.challengeId = challengeId;
                adjustBody.value = JSON.stringify(bodyObj, null, 2);
            } catch (e) {
                adjustBody.value = JSON.stringify({
                    challengeId: challengeId,
                    score: 85
                }, null, 2);
            }
        }
        
        displayStatus(`Challenge ID fields populated with: ${challengeId}`, false);
    }
    
    // Function to create or login a user directly with Supabase
    async function createOrLoginUser(email, password, fullName) {
        clearResponse();
        
        let responseInfo = `Attempting to login or create user: ${email}\n`;
        responseOutput.textContent = responseInfo + '\n---\nProcessing...';
        
        try {
            // First try to login
            responseInfo += `\nAttempting login...`;
            responseOutput.textContent = responseInfo + '\n---\nProcessing...';
            
            // Try login first
            const loginResult = await makeApiCall('POST', '/v1/auth/login', {
                email,
                password
            }, false); // Don't use auth token for login
            
            if (loginResult && loginResult.token) {
                // Login success
                authToken = loginResult.token;
                currentUser = {
                    email: email,
                    ...loginResult.user
                };
                
                updateUserStatus();
                populateEmailFields(email);
                
                displayStatus(`Successfully logged in as ${email}`, false);
                return;
            }
            
            // If login fails, try to sign up
            responseInfo += `\nLogin failed. Attempting to create new user...`;
            responseOutput.textContent = responseInfo + '\n---\nProcessing...';
            
            const signupResult = await makeApiCall('POST', '/v1/auth/signup', {
                email,
                password,
                fullName
            }, false); // Don't use auth token for signup
            
            if (signupResult && signupResult.token) {
                // Signup success
                authToken = signupResult.token;
                currentUser = {
                    email: email,
                    ...signupResult.user
                };
                
                updateUserStatus();
                populateEmailFields(email);
                
                displayStatus(`Successfully created and logged in as ${email}`, false);
                return;
            }
            
            // Alternative approach if the auth endpoints don't work: create the user directly through the users endpoint
            responseInfo += `\nDirect auth methods failed. Trying alternate approach...`;
            responseOutput.textContent = responseInfo + '\n---\nProcessing...';
            
            // Try creating user directly 
            const createUserResult = await makeApiCall('POST', '/v1/users', {
                email,
                password,
                fullName
            }, false);
            
            if (createUserResult) {
                // If user created or already exists, try to get the user
                const user = await makeApiCall('GET', `/v1/users/email/${encodeURIComponent(email)}`, null, false);
                
                if (user) {
                    // Manual login success
                    currentUser = {
                        email: email,
                        ...user
                    };
                    
                    // We don't have a token, but we can still use the user
                    authToken = 'test-token'; // Dummy token for UI purposes
                    
                    updateUserStatus();
                    populateEmailFields(email);
                    
                    displayStatus(`User available: ${email}. No authentication token available but user can be referenced.`, false);
                    return;
                }
            }
            
            displayStatus(`Failed to login or create user. Try using a different email or check server logs.`, true);
            
        } catch (error) {
            console.error('User creation/login error:', error);
            displayStatus(`Error: ${error.message}`, true);
            responseOutput.textContent = responseInfo + `\n---\nError: ${error.message}`;
        }
    }

    // Function to execute an API call
    async function makeApiCall(method, endpoint, body = null, useAuthToken = true) {
        clearResponse();
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add auth token if available and should be used
        if (useAuthToken && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
            method: method.toUpperCase(),
            headers: headers,
        };

        if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            options.body = JSON.stringify(body);
        }

        // Ensure endpoint is formatted correctly
        if (!endpoint.startsWith('/v1')) {
            endpoint = `/v1${endpoint}`;
        }

        // Construct full URL relative to the current host
        const url = `/api${endpoint}`; // Use /api prefix for all requests

        // Display Request Info
        let requestInfo = `Request: ${method.toUpperCase()} ${url}\n`;
        requestInfo += `Headers: ${JSON.stringify(headers, (key, value) => 
            key === 'Authorization' ? 'Bearer ...REDACTED' : value, 2)}\n`;
        
        if (options.body) {
            requestInfo += `Body: ${options.body}\n`;
        }
        
        responseOutput.textContent = requestInfo + '\n---\nWaiting for response...';

        try {
            const response = await fetch(url, options);
            const responseData = await response.json();

            const fullResponseText = `--- Request ---\n${requestInfo}\n--- Response (${response.status} ${response.statusText}) ---\n${JSON.stringify(responseData, null, 2)}`;

            // Update the JSON editor if available
            const jsonEditor = document.getElementById('json-editor');
            if (jsonEditor) {
                try {
                    // Clear previous content
                    jsonEditor.innerHTML = '';
                    
                    // Create a new editor
                    const editor = new JSONEditor(jsonEditor, {
                        mode: 'view',
                        mainMenuBar: false
                    });
                    
                    // Set the data
                    editor.set(responseData);
                    
                    // Expand the editor
                    editor.expandAll();
                } catch (e) {
                    console.error('Error initializing JSON editor:', e);
                }
            }

            if (!response.ok) {
                // Handle API errors (like 4xx, 5xx)
                displayStatus(`Error: ${response.status} ${response.statusText} - ${responseData.message || 'Unknown API error'}`, true);
                responseOutput.textContent = fullResponseText;
            } else {
                // Handle success
                displayStatus(`Success: ${response.status} ${response.statusText}`, false);
                responseOutput.textContent = fullResponseText;
                
                // Save login/signup token
                if (endpoint === '/v1/auth/login' || endpoint === '/v1/auth/signup') {
                    if (responseData.token || responseData.data?.token) {
                        authToken = responseData.token || responseData.data.token;
                        
                        // Also save current user if available
                        if (responseData.user || responseData.data?.user) {
                            currentUser = responseData.user || responseData.data.user;
                            populateEmailFields(currentUser.email);
                            updateUserStatus();
                        }
                    }
                }
                
                // If this is user data, populate email fields
                if (endpoint === '/v1/users/me' && responseData.data?.user?.email) {
                    populateEmailFields(responseData.data.user.email);
                    
                    // Also update current user
                    currentUser = {
                        email: responseData.data.user.email,
                        ...responseData.data.user
                    };
                    updateUserStatus();
                }
                
                // If this is a challenge response, populate challenge ID fields
                if (endpoint.includes('/challenges/generate') && responseData.data?.challenge?.id) {
                    populateChallengeIdFields(responseData.data.challenge.id);
                    
                    // Also populate user email if available
                    if (responseData.data.challenge.userId) {
                        populateEmailFields(responseData.data.challenge.userId);
                    }
                }
                
                return responseData.data || responseData; // Return the 'data' part for chaining
            }
        } catch (error) {
            // Handle network errors or failed fetch
            console.error('Fetch error:', error);
            displayStatus(`Network Error: ${error.message}`, true);
            responseOutput.textContent = `--- Request ---\n${requestInfo}\n--- Error ---\n${error.message}`;
        }
        return null; // Indicate failure or no data
    }

    // --- Event Listeners ---

    // Create or login user
    document.getElementById('btn-create-login-user')?.addEventListener('click', async () => {
        const email = document.getElementById('test-user-email').value;
        const password = document.getElementById('test-user-password').value;
        const fullName = document.getElementById('test-user-name').value;
        
        if (!email || !password) {
            displayStatus('Email and password are required.', true);
            return;
        }
        
        await createOrLoginUser(email, password, fullName);
    });

    // Clear response
    document.getElementById('btn-clear-response')?.addEventListener('click', () => {
        responseOutput.textContent = 'Output cleared.';
        statusMessage.textContent = '';
        statusMessage.className = '';
    });

    // ---- CHALLENGES ----

    // Generate Challenge
    document.getElementById('btn-generate-challenge')?.addEventListener('click', async () => {
        const email = document.getElementById('gen-challenge-email').value;
        const focusArea = document.getElementById('gen-challenge-focus').value;
        const challengeType = document.getElementById('gen-challenge-type').value;
        const difficulty = document.getElementById('gen-challenge-difficulty').value;

        if (!email) {
            displayStatus('User Email is required for generating challenge.', true);
            return;
        }

        const body = { email };
        if (focusArea) body.focusArea = focusArea;
        if (challengeType) body.challengeType = challengeType;
        if (difficulty) body.difficulty = difficulty;

        await makeApiCall('POST', '/challenges/generate', body);
    });

    // Submit Response
    document.getElementById('btn-submit-response')?.addEventListener('click', async () => {
        const challengeId = document.getElementById('submit-challenge-id').value;
        const userEmail = document.getElementById('submit-user-email').value;
        const responseText = document.getElementById('submit-response-text').value;

        if (!challengeId || !userEmail || !responseText) {
            displayStatus('Challenge ID, User Email, and Response Text are required.', true);
            return;
        }

        const body = { userEmail, response: responseText };
        await makeApiCall('POST', `/challenges/${challengeId}/submit`, body);
    });

    // Get Challenge by ID
    document.getElementById('btn-get-challenge')?.addEventListener('click', async () => {
        const challengeId = document.getElementById('get-challenge-id').value;
        if (!challengeId) {
            displayStatus('Challenge ID is required.', true);
            return;
        }
        await makeApiCall('GET', `/challenges/${challengeId}`);
    });
    
    // Get Challenge History
    document.getElementById('btn-get-challenge-history')?.addEventListener('click', async () => {
        const email = document.getElementById('get-challenge-history-email').value;
        if (!email) {
            displayStatus('User Email is required.', true);
            return;
        }
        await makeApiCall('GET', `/challenges/user/${encodeURIComponent(email)}/history`);
    });

    // ---- USERS ----

    // Get Current User
    document.getElementById('btn-get-me')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/users/me');
    });

    // Update Current User
    document.getElementById('btn-update-me')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('update-user-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            await makeApiCall('PUT', '/users/me', body);
        } catch (e) {
            displayStatus('Invalid JSON in update body.', true);
        }
    });

    // ---- PERSONALITY ----

    // Get Personality Profile
    document.getElementById('btn-get-personality-profile')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/personality/profile');
    });

    // Update Traits
    document.getElementById('btn-update-traits')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('update-traits-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.personalityTraits) {
                displayStatus('Body must contain "personalityTraits" object.', true);
                return;
            }
            await makeApiCall('PUT', '/personality/traits', body);
        } catch (e) {
            displayStatus('Invalid JSON in traits body.', true);
        }
    });

    // Update Attitudes
    document.getElementById('btn-update-attitudes')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('update-attitudes-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.aiAttitudes) {
                displayStatus('Body must contain "aiAttitudes" object.', true);
                return;
            }
            await makeApiCall('PUT', '/personality/attitudes', body);
        } catch (e) {
            displayStatus('Invalid JSON in attitudes body.', true);
        }
    });

    // Generate Insights
    document.getElementById('btn-generate-insights')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/personality/insights');
    });

    // ---- FOCUS AREAS ----
    
    // Get All Focus Areas
    document.getElementById('btn-get-all-focus-areas')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/focus-areas');
    });
    
    // Get User Focus Areas
    document.getElementById('btn-get-user-focus-areas')?.addEventListener('click', async () => {
        const email = document.getElementById('fa-get-email').value;
        if (!email) {
            displayStatus('User Email is required.', true);
            return;
        }
        await makeApiCall('GET', `/focus-areas/users/${encodeURIComponent(email)}`);
    });
    
    // Set User Focus Areas
    document.getElementById('btn-set-user-focus-areas')?.addEventListener('click', async () => {
        const email = document.getElementById('fa-set-email').value;
        const bodyText = document.getElementById('fa-set-body').value;
        if (!email) {
            displayStatus('User Email is required.', true);
            return;
        }
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.focusAreas || !Array.isArray(body.focusAreas)) {
                displayStatus('Body must contain "focusAreas" array.', true);
                return;
            }
            await makeApiCall('PUT', `/focus-areas/users/${encodeURIComponent(email)}`, body);
        } catch (e) {
            displayStatus('Invalid JSON in focus areas body.', true);
        }
    });
    
    // Get Recommended Focus Areas
    document.getElementById('btn-get-recommended-focus-areas')?.addEventListener('click', async () => {
        const email = document.getElementById('fa-rec-email').value;
        if (!email) {
            displayStatus('User Email is required.', true);
            return;
        }
        await makeApiCall('GET', `/focus-areas/users/${encodeURIComponent(email)}/recommended`);
    });
    
    // ---- PROGRESS ----
    
    // Get User Progress
    document.getElementById('btn-get-progress')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/progress');
    });
    
    // Get All Progress
    document.getElementById('btn-get-all-progress')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/progress/all');
    });
    
    // Get Challenge Progress
    document.getElementById('btn-get-challenge-progress')?.addEventListener('click', async () => {
        const challengeId = document.getElementById('progress-challenge-id').value;
        if (!challengeId) {
            displayStatus('Challenge ID is required.', true);
            return;
        }
        await makeApiCall('GET', `/progress/challenge/${challengeId}`);
    });
    
    // Complete Challenge
    document.getElementById('btn-complete-challenge')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('complete-challenge-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.challengeId) {
                displayStatus('Body must contain "challengeId" field.', true);
                return;
            }
            if (body.score === undefined) {
                displayStatus('Body must contain "score" field.', true);
                return;
            }
            await makeApiCall('POST', '/progress/complete', body);
        } catch (e) {
            displayStatus('Invalid JSON in complete challenge body.', true);
        }
    });
    
    // Update Skills
    document.getElementById('btn-update-skills')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('update-skills-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.skillLevels) {
                displayStatus('Body must contain "skillLevels" object.', true);
                return;
            }
            await makeApiCall('PUT', '/progress/skills', body);
        } catch (e) {
            displayStatus('Invalid JSON in skills body.', true);
        }
    });
    
    // ---- EVALUATIONS ----
    
    // Get Evaluation
    document.getElementById('btn-get-evaluation')?.addEventListener('click', async () => {
        const evalId = document.getElementById('eval-id').value;
        if (!evalId) {
            displayStatus('Evaluation ID is required.', true);
            return;
        }
        await makeApiCall('GET', `/evaluations/${evalId}`);
    });
    
    // Get User Evaluations
    document.getElementById('btn-get-user-evaluations')?.addEventListener('click', async () => {
        const userId = document.getElementById('eval-user-id').value;
        if (!userId) {
            displayStatus('User ID/Email is required.', true);
            return;
        }
        await makeApiCall('GET', `/evaluations/user/${encodeURIComponent(userId)}`);
    });
    
    // Get Challenge Evaluations
    document.getElementById('btn-get-challenge-evaluations')?.addEventListener('click', async () => {
        const challengeId = document.getElementById('eval-challenge-id').value;
        if (!challengeId) {
            displayStatus('Challenge ID is required.', true);
            return;
        }
        await makeApiCall('GET', `/evaluations/challenge/${challengeId}`);
    });
    
    // ---- ADAPTIVE ----
    
    // Get Recommendations
    document.getElementById('btn-get-adaptive-recommendations')?.addEventListener('click', async () => {
        await makeApiCall('GET', '/adaptive/recommendations');
    });
    
    // Generate Adaptive Challenge
    document.getElementById('btn-generate-adaptive-challenge')?.addEventListener('click', async () => {
        const focusArea = document.getElementById('adaptive-focus-area').value;
        let endpoint = '/adaptive/challenge/generate';
        if (focusArea) {
            endpoint += `?focusArea=${encodeURIComponent(focusArea)}`;
        }
        const data = await makeApiCall('GET', endpoint);
        
        // If we get a challenge ID, populate related fields
        if (data?.challenge?.id) {
            populateChallengeIdFields(data.challenge.id);
        }
    });
    
    // Adjust Difficulty
    document.getElementById('btn-adjust-difficulty')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('adjust-difficulty-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.challengeId) {
                displayStatus('Body must contain "challengeId" field.', true);
                return;
            }
            if (body.score === undefined) {
                displayStatus('Body must contain "score" field.', true);
                return;
            }
            await makeApiCall('POST', '/adaptive/difficulty/adjust', body);
        } catch (e) {
            displayStatus('Invalid JSON in difficulty adjust body.', true);
        }
    });
    
    // ---- USER JOURNEY ----
    
    // Log User Event
    document.getElementById('btn-log-user-event')?.addEventListener('click', async () => {
        const bodyText = document.getElementById('journey-event-body').value;
        try {
            const body = JSON.parse(bodyText || '{}');
            if (!body.email) {
                displayStatus('Body must contain "email" field.', true);
                return;
            }
            if (!body.eventType) {
                displayStatus('Body must contain "eventType" field.', true);
                return;
            }
            await makeApiCall('POST', '/user-journey/events', body);
        } catch (e) {
            displayStatus('Invalid JSON in user event body.', true);
        }
    });
    
    // Get User Events
    document.getElementById('btn-get-user-events')?.addEventListener('click', async () => {
        const email = document.getElementById('journey-user-email').value;
        if (!email) {
            displayStatus('User Email is required.', true);
            return;
        }
        await makeApiCall('GET', `/user-journey/users/${encodeURIComponent(email)}/events`);
    });
    
    // Get User Activity
    document.getElementById('btn-get-user-activity')?.addEventListener('click', async () => {
        const email = document.getElementById('journey-activity-email').value;
        const timeframe = document.getElementById('journey-timeframe').value;
        if (!email) {
            displayStatus('User Email is required.', true);
            return;
        }
        let endpoint = `/user-journey/users/${encodeURIComponent(email)}/activity`;
        if (timeframe) {
            endpoint += `?timeframe=${encodeURIComponent(timeframe)}`;
        }
        await makeApiCall('GET', endpoint);
    });

    // Add more event listeners for other buttons here...
    
    // Initialize the UI
    updateUserStatus();
}); 