/**
 * API Endpoints Definition File
 * This file contains the definitions for all API endpoints used in the tester UI.
 * Each endpoint has a unique id, display name, path, method, and input fields.
 */

const API_ENDPOINTS = {
  // Authentication Endpoints
  auth: {
    section: {
      id: "auth",
      title: "Quick User Setup"
    },
    endpoints: [
      {
        id: "createLoginUser",
        name: "Create/Login Test User",
        path: null, // Special handling in code
        method: "POST",
        fields: [
          { id: "email", label: "Email:", type: "text", placeholder: "test@example.com", defaultValue: "tester@example.com" },
          { id: "password", label: "Password:", type: "password", placeholder: "Password", defaultValue: "password123" },
          { id: "fullName", label: "Full Name (for signup):", type: "text", placeholder: "Test User", defaultValue: "Test User" }
        ],
        description: "This will create a new user if the email doesn't exist, or log in if it does."
      }
    ]
  },

  // Challenges Endpoints
  challenges: {
    section: {
      id: "challenges",
      title: "Challenges"
    },
    endpoints: [
      {
        id: "generateChallenge",
        name: "Generate Challenge",
        path: "/v1/challenges/generate",
        method: "POST",
        fields: [
          { id: "email", label: "User Email:", type: "text", placeholder: "user@example.com" },
          { id: "focusArea", label: "Focus Area (Optional):", type: "text", placeholder: "AI Ethics" },
          { id: "challengeType", label: "Challenge Type (Optional):", type: "text", placeholder: "scenario" },
          { 
            id: "difficulty", 
            label: "Difficulty (Optional):", 
            type: "select", 
            options: [
              { value: "medium", label: "Medium" },
              { value: "beginner", label: "Beginner" },
              { value: "advanced", label: "Advanced" },
              { value: "expert", label: "Expert" }
            ],
            defaultValue: "medium"
          }
        ]
      },
      {
        id: "submitResponse",
        name: "Submit Response",
        path: "/v1/challenges/:challengeId/submit",
        method: "POST",
        fields: [
          { id: "challengeId", label: "Challenge ID:", type: "text", placeholder: "UUID of the challenge" },
          { id: "userEmail", label: "User Email:", type: "text", placeholder: "user@example.com" },
          { id: "responseText", label: "Response Text:", type: "textarea", placeholder: "User's response", rows: 4 }
        ]
      },
      {
        id: "getChallengeById",
        name: "Get Challenge By ID",
        path: "/v1/challenges/:challengeId",
        method: "GET",
        fields: [
          { id: "challengeId", label: "Challenge ID:", type: "text", placeholder: "UUID of the challenge" }
        ]
      },
      {
        id: "getChallengeHistory",
        name: "Get User Challenge History",
        path: "/v1/challenges/user/:email/history",
        method: "GET",
        fields: [
          { id: "email", label: "User Email:", type: "text", placeholder: "user@example.com" }
        ]
      }
    ]
  },

  // Users Endpoints
  users: {
    section: {
      id: "users",
      title: "Users"
    },
    endpoints: [
      {
        id: "getMe",
        name: "Get Current User",
        path: "/v1/users/me",
        method: "GET",
        fields: []
      },
      {
        id: "updateMe",
        name: "Update Current User",
        path: "/v1/users/me",
        method: "PUT",
        fields: [
          { id: "updateBody", label: "Update Body (JSON):", type: "json", placeholder: '{ "professionalTitle": "Senior Dev" }', rows: 4 }
        ]
      }
    ]
  },

  // Personality Endpoints
  personality: {
    section: {
      id: "personality",
      title: "Personality"
    },
    endpoints: [
      {
        id: "getPersonalityProfile",
        name: "Get My Profile",
        path: "/v1/personality/profile",
        method: "GET",
        fields: []
      },
      {
        id: "updateTraits",
        name: "Update Traits",
        path: "/v1/personality/traits",
        method: "PUT",
        fields: [
          { id: "traitsBody", label: "Traits Body (JSON):", type: "json", placeholder: '{ "personalityTraits": { "analytical": 85 } }', rows: 4 }
        ]
      },
      {
        id: "updateAttitudes",
        name: "Update Attitudes",
        path: "/v1/personality/attitudes",
        method: "PUT",
        fields: [
          { id: "attitudesBody", label: "Attitudes Body (JSON):", type: "json", placeholder: '{ "aiAttitudes": { "trust": 70 } }', rows: 4 }
        ]
      },
      {
        id: "generateInsights",
        name: "Generate Insights",
        path: "/v1/personality/insights",
        method: "GET",
        fields: []
      }
    ]
  },

  // Focus Areas Endpoints
  focusAreas: {
    section: {
      id: "focusAreas",
      title: "Focus Areas"
    },
    endpoints: [
      {
        id: "getAllFocusAreas",
        name: "Get All Focus Areas",
        path: "/v1/focus-areas",
        method: "GET",
        fields: []
      },
      {
        id: "getUserFocusAreas",
        name: "Get User Focus Areas",
        path: "/v1/focus-areas/users/:email",
        method: "GET",
        fields: [
          { id: "email", label: "User Email:", type: "text", placeholder: "user@example.com" }
        ]
      },
      {
        id: "setUserFocusAreas",
        name: "Set User Focus Areas",
        path: "/v1/focus-areas/users/:email",
        method: "PUT",
        fields: [
          { id: "email", label: "User Email:", type: "text", placeholder: "user@example.com" },
          { id: "focusAreasBody", label: "Focus Areas Body (JSON):", type: "json", placeholder: '{ "focusAreas": ["AI Ethics", "Prompt Engineering"] }', rows: 4 }
        ]
      },
      {
        id: "getRecommendedFocusAreas",
        name: "Get Recommended Focus Areas",
        path: "/v1/focus-areas/users/:email/recommended",
        method: "GET",
        fields: [
          { id: "email", label: "User Email:", type: "text", placeholder: "user@example.com" }
        ]
      }
    ]
  },

  // Progress Endpoints
  progress: {
    section: {
      id: "progress",
      title: "Progress"
    },
    endpoints: [
      {
        id: "getProgress",
        name: "Get User Progress",
        path: "/v1/progress",
        method: "GET",
        fields: []
      },
      {
        id: "getAllProgress",
        name: "Get All Progress",
        path: "/v1/progress/all",
        method: "GET",
        fields: []
      },
      {
        id: "getChallengeProgress",
        name: "Get Challenge Progress",
        path: "/v1/progress/challenge/:challengeId",
        method: "GET",
        fields: [
          { id: "challengeId", label: "Challenge ID:", type: "text", placeholder: "UUID of the challenge" }
        ]
      },
      {
        id: "completeChallenge",
        name: "Complete Challenge",
        path: "/v1/progress/complete",
        method: "POST",
        fields: [
          { id: "completeBody", label: "Complete Body (JSON):", type: "json", placeholder: '{ "challengeId": "uuid", "score": 85, "completionTime": 300 }', rows: 4 }
        ]
      },
      {
        id: "updateSkills",
        name: "Update Skills",
        path: "/v1/progress/skills",
        method: "PUT",
        fields: [
          { id: "skillsBody", label: "Skills Body (JSON):", type: "json", placeholder: '{ "skillLevels": { "criticalThinking": 75, "creativity": 80 } }', rows: 4 }
        ]
      }
    ]
  },

  // Evaluations Endpoints
  evaluations: {
    section: {
      id: "evaluations",
      title: "Evaluations"
    },
    endpoints: [
      {
        id: "getEvaluation",
        name: "Get Evaluation",
        path: "/v1/evaluations/:id",
        method: "GET",
        fields: [
          { id: "id", label: "Evaluation ID:", type: "text", placeholder: "UUID of the evaluation" }
        ]
      },
      {
        id: "getUserEvaluations",
        name: "Get User Evaluations",
        path: "/v1/evaluations/user/:userId",
        method: "GET",
        fields: [
          { id: "userId", label: "User ID/Email:", type: "text", placeholder: "User ID or email" }
        ]
      },
      {
        id: "getChallengeEvaluations",
        name: "Get Challenge Evaluations",
        path: "/v1/evaluations/challenge/:challengeId",
        method: "GET",
        fields: [
          { id: "challengeId", label: "Challenge ID:", type: "text", placeholder: "UUID of the challenge" }
        ]
      }
    ]
  },

  // Adaptive Learning Endpoints
  adaptiveLearning: {
    section: {
      id: "adaptiveLearning",
      title: "Adaptive Learning"
    },
    endpoints: [
      {
        id: "getAdaptiveRecommendations",
        name: "Get Recommendations",
        path: "/v1/adaptive/recommendations",
        method: "GET",
        fields: []
      },
      {
        id: "generateAdaptiveChallenge",
        name: "Generate Adaptive Challenge",
        path: "/v1/adaptive/challenge/generate",
        method: "GET",
        fields: [
          { id: "focusArea", label: "Focus Area (Optional):", type: "text", placeholder: "AI Ethics" }
        ]
      },
      {
        id: "adjustDifficulty",
        name: "Adjust Difficulty",
        path: "/v1/adaptive/difficulty/adjust",
        method: "POST",
        fields: [
          { id: "adjustBody", label: "Adjust Body (JSON):", type: "json", placeholder: '{ "challengeId": "uuid", "score": 85 }', rows: 4 }
        ]
      }
    ]
  },

  // User Journey Endpoints
  userJourney: {
    section: {
      id: "userJourney",
      title: "User Journey"
    },
    endpoints: [
      {
        id: "logUserEvent",
        name: "Log User Event",
        path: "/v1/user-journey/events",
        method: "POST",
        fields: [
          { id: "eventBody", label: "Event Body (JSON):", type: "json", placeholder: '{ "email": "user@example.com", "eventType": "challengeStarted", "eventData": { "challengeId": "uuid" } }', rows: 4 }
        ]
      },
      {
        id: "getUserEvents",
        name: "Get User Events",
        path: "/v1/user-journey/current",
        method: "GET",
        fields: []
      },
      {
        id: "getUserActivity",
        name: "Get User Activity",
        path: "/v1/user-journey/users/:email/activity",
        method: "GET",
        fields: [
          { id: "email", label: "User Email:", type: "text", placeholder: "user@example.com" },
          { 
            id: "timeframe", 
            label: "Timeframe (Optional):", 
            type: "select", 
            options: [
              { value: "week", label: "Last Week" },
              { value: "month", label: "Last Month" },
              { value: "all", label: "All Time" }
            ],
            defaultValue: "week"
          }
        ]
      }
    ]
  },
  
  // Auth Endpoints
  authentication: {
    section: {
      id: "authentication",
      title: "Authentication"
    },
    endpoints: [
      {
        id: "login",
        name: "Login",
        path: "/v1/auth/login",
        method: "POST",
        fields: [
          { id: "email", label: "Email:", type: "text", placeholder: "user@example.com" },
          { id: "password", label: "Password:", type: "password", placeholder: "Password" }
        ]
      },
      {
        id: "signup",
        name: "Signup",
        path: "/v1/auth/signup",
        method: "POST",
        fields: [
          { id: "email", label: "Email:", type: "text", placeholder: "user@example.com" },
          { id: "password", label: "Password:", type: "password", placeholder: "Password" },
          { id: "fullName", label: "Full Name:", type: "text", placeholder: "Full Name" }
        ]
      }
    ]
  }
}; 