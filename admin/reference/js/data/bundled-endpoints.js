/**
 * Bundled Endpoints
 * Default endpoints for the API Tester UI
 */

export const bundledEndpoints = {
  "endpoints": [
    // Authentication flow
    {
      "name": "1. Sign Up",
      "method": "POST",
      "path": "/api/v1/auth/signup",
      "description": "Step 1: Create a new user account to begin the journey",
      "category": "1. User Setup Flow",
      "parameters": [],
      "requestBody": {
        "name": "Signup details",
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "email": {
                  "type": "string",
                  "example": "newuser@example.com"
                },
                "password": {
                  "type": "string",
                  "example": "securePassword123"
                },
                "fullName": {
                  "type": "string",
                  "example": "Jane Smith"
                }
              },
              "required": ["email", "password", "fullName"]
            }
          }
        }
      },
      "responseExample": {
        "success": true,
        "data": {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": "6729a051-f5da-42e1-9626-142157770000",
            "email": "newuser@example.com",
            "fullName": "Jane Smith",
            "role": "user",
            "createdAt": "2023-05-22T14:56:38.000Z"
          }
        }
      }
    },
    {
      "name": "2. Login",
      "method": "POST",
      "path": "/api/v1/auth/login",
      "description": "Step 2: Log in with your credentials",
      "category": "1. User Setup Flow",
      "parameters": [],
      "requestBody": {
        "name": "Login credentials",
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "email": {
                  "type": "string",
                  "example": "newuser@example.com"
                },
                "password": {
                  "type": "string",
                  "example": "securePassword123"
                }
              },
              "required": ["email", "password"]
            }
          }
        }
      },
      "responseExample": {
        "success": true,
        "data": {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "user@example.com",
            "fullName": "John Doe",
            "role": "user",
            "createdAt": "2023-01-15T08:30:25.000Z"
          }
        }
      }
    },
    {
      "name": "3. Get User Profile",
      "method": "GET",
      "path": "/api/v1/users/me",
      "description": "Step 3: Retrieve your user profile after login",
      "category": "1. User Setup Flow",
      "parameters": [],
      "responseExample": {
        "success": true,
        "data": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "email": "user@example.com",
          "fullName": "John Doe",
          "role": "user",
          "createdAt": "2023-01-15T08:30:25.000Z"
        }
      }
    },

    // Personality assessment flow
    {
      "name": "1. Submit Personality Assessment",
      "method": "POST",
      "path": "/api/v1/personality/assessment/submit",
      "description": "Step 1: Submit your personality assessment answers",
      "category": "2. Personality Assessment Flow",
      "parameters": [],
      "requestBody": {
        "name": "Assessment answers",
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "answers": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "questionId": {
                        "type": "string"
                      },
                      "answer": {
                        "type": "string"
                      }
                    }
                  }
                }
              },
              "required": ["answers"]
            },
            "example": {
              "answers": [
                {
                  "questionId": "q1",
                  "answer": "strongly_agree"
                },
                {
                  "questionId": "q2", 
                  "answer": "neutral"
                },
                {
                  "questionId": "q3",
                  "answer": "disagree"
                },
                {
                  "questionId": "q4",
                  "answer": "strongly_disagree"
                },
                {
                  "questionId": "q5",
                  "answer": "agree"
                }
              ]
            }
          }
        }
      },
      "responseExample": {
        "success": true,
        "data": {
          "profileUpdated": true,
          "newInsights": true
        }
      }
    },
    {
      "name": "2. Get Personality Profile",
      "method": "GET",
      "path": "/api/v1/personality/profile",
      "description": "Step 2: View your personality profile after assessment",
      "category": "2. Personality Assessment Flow",
      "parameters": [],
      "responseExample": {
        "success": true,
        "data": {
          "traits": [
            {
              "name": "openness",
              "score": 85,
              "description": "High openness to new experiences"
            },
            {
              "name": "conscientiousness",
              "score": 70,
              "description": "Above average conscientiousness"
            },
            {
              "name": "extraversion",
              "score": 55,
              "description": "Moderate extraversion"
            },
            {
              "name": "agreeableness",
              "score": 75,
              "description": "High agreeableness"
            },
            {
              "name": "neuroticism",
              "score": 40,
              "description": "Below average neuroticism"
            }
          ],
          "insights": {
            "learningStyle": "visual",
            "strengths": ["problem-solving", "creativity"],
            "weaknesses": ["time management"]
          },
          "lastUpdated": "2023-05-20T09:15:00Z"
        }
      }
    },

    // Focus Areas flow
    {
      "name": "1. Get Available Focus Areas",
      "method": "GET",
      "path": "/api/v1/focus-areas",
      "description": "Step 1: View available focus areas for learning",
      "category": "3. Focus Areas Flow",
      "parameters": [],
      "responseExample": {
        "success": true,
        "data": {
          "focusAreas": [
            {
              "id": "fa1",
              "name": "Algorithms",
              "description": "Data structures and algorithms for efficient problem solving",
              "topics": ["sorting", "searching", "dynamic programming"]
            },
            {
              "id": "fa2",
              "name": "Frontend Development",
              "description": "Building user interfaces and client-side applications",
              "topics": ["html/css", "javascript", "react", "responsive design"]
            },
            {
              "id": "fa3",
              "name": "Backend Development",
              "description": "Server-side programming and API development",
              "topics": ["node.js", "express", "databases", "api design"]
            }
          ]
        }
      }
    },
    {
      "name": "2. Update User Focus Areas",
      "method": "PUT",
      "path": "/api/v1/focus-areas/user",
      "description": "Step 2: Select your focus areas and priorities",
      "category": "3. Focus Areas Flow",
      "parameters": [],
      "requestBody": {
        "name": "Focus area preferences",
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "focusAreas": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "priorityLevel": {
                        "type": "string",
                        "enum": ["high", "medium", "low"]
                      }
                    }
                  }
                }
              },
              "required": ["focusAreas"]
            },
            "example": {
              "focusAreas": [
                {
                  "id": "fa1",
                  "priorityLevel": "high"
                },
                {
                  "id": "fa3",
                  "priorityLevel": "medium"
                }
              ]
            }
          }
        }
      },
      "responseExample": {
        "success": true,
        "data": {
          "updated": true,
          "userFocusAreas": [
            {
              "id": "fa1",
              "name": "Algorithms",
              "progress": 0,
              "priorityLevel": "high"
            },
            {
              "id": "fa3",
              "name": "Backend Development",
              "progress": 0,
              "priorityLevel": "medium"
            }
          ]
        }
      }
    },
    {
      "name": "3. View User Focus Areas",
      "method": "GET",
      "path": "/api/v1/focus-areas/user",
      "description": "Step 3: View your selected focus areas",
      "category": "3. Focus Areas Flow",
      "parameters": [],
      "responseExample": {
        "success": true,
        "data": {
          "userFocusAreas": [
            {
              "id": "fa1",
              "name": "Algorithms",
              "progress": 0,
              "priorityLevel": "high"
            },
            {
              "id": "fa3",
              "name": "Backend Development",
              "progress": 0,
              "priorityLevel": "medium"
            }
          ]
        }
      }
    },

    // Challenges flow
    {
      "name": "1. Generate Challenge",
      "method": "POST",
      "path": "/api/v1/challenges/generate",
      "description": "Step 1: Generate a personalized challenge based on your profile",
      "category": "4. Challenges Flow",
      "parameters": [],
      "requestBody": {
        "name": "Challenge preferences",
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "difficulty": {
                  "type": "string",
                  "example": "intermediate"
                },
                "type": {
                  "type": "string",
                  "example": "coding"
                },
                "focusArea": {
                  "type": "string",
                  "example": "algorithms"
                }
              }
            }
          }
        }
      },
      "responseExample": {
        "success": true,
        "data": {
          "id": "c3",
          "title": "Depth-First Graph Traversal",
          "description": "Implement a depth-first traversal algorithm",
          "content": "In this challenge, you'll implement a depth-first traversal of a graph...",
          "difficulty": "intermediate",
          "type": "coding",
          "focusArea": "algorithms",
          "createdAt": "2023-06-10T15:45:00Z"
        }
      }
    },
    {
      "name": "2. Get Challenge Details",
      "method": "GET",
      "path": "/api/v1/challenges/{id}",
      "description": "Step 2: View challenge details",
      "category": "4. Challenges Flow",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "type": "string",
          "description": "Challenge ID",
          "example": "c3"
        }
      ],
      "responseExample": {
        "success": true,
        "data": {
          "id": "c3",
          "title": "Depth-First Graph Traversal",
          "description": "Implement a depth-first traversal algorithm",
          "content": "In this challenge, you'll implement a depth-first traversal of a graph...",
          "difficulty": "intermediate",
          "type": "coding",
          "focusArea": "algorithms",
          "createdAt": "2023-02-10T10:00:00Z"
        }
      }
    },
    {
      "name": "3. Submit Challenge Response",
      "method": "POST",
      "path": "/api/v1/challenges/{id}/responses",
      "description": "Step 3: Submit your solution to the challenge",
      "category": "4. Challenges Flow",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "type": "string",
          "description": "Challenge ID",
          "example": "c3"
        }
      ],
      "requestBody": {
        "name": "Challenge response",
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "code": {
                  "type": "string",
                  "example": "function dfs(graph, startNode) {\n  const visited = new Set();\n  \n  function traverse(node) {\n    visited.add(node);\n    console.log(node);\n    \n    const neighbors = graph[node] || [];\n    for (const neighbor of neighbors) {\n      if (!visited.has(neighbor)) {\n        traverse(neighbor);\n      }\n    }\n  }\n  \n  traverse(startNode);\n  return visited;\n}"
                },
                "language": {
                  "type": "string",
                  "example": "javascript"
                }
              },
              "required": ["code", "language"]
            }
          }
        }
      },
      "responseExample": {
        "success": true,
        "data": {
          "id": "r1",
          "challengeId": "c3",
          "evaluation": {
            "status": "passed",
            "score": 95,
            "feedback": "Good job! Your solution passes all test cases."
          },
          "submittedAt": "2023-06-10T15:30:00Z"
        }
      }
    },

    // Evaluation flow
    {
      "name": "1. Get Evaluation Results",
      "method": "GET",
      "path": "/api/v1/evaluations/{id}",
      "description": "Step 1: View your challenge evaluation results",
      "category": "5. Evaluation Flow",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "type": "string",
          "description": "Evaluation ID",
          "example": "r1"
        }
      ],
      "responseExample": {
        "success": true,
        "data": {
          "id": "e1",
          "challengeId": "c3",
          "userId": "550e8400-e29b-41d4-a716-446655440000",
          "status": "completed",
          "score": 95,
          "feedback": "Good job! Your solution passes all test cases with good performance.",
          "details": {
            "testCases": [
              {
                "name": "Test Case 1",
                "passed": true,
                "output": "[2, 4, 6, 8]"
              },
              {
                "name": "Test Case 2",
                "passed": true,
                "output": "[]"
              }
            ],
            "metrics": {
              "efficiency": 90,
              "readability": 85,
              "robustness": 92
            }
          },
          "completedAt": "2023-06-01T14:30:00Z"
        }
      }
    },

    // Progress tracking flow
    {
      "name": "1. Get Learning Progress",
      "method": "GET",
      "path": "/api/v1/progress/history",
      "description": "Step 1: View your overall learning progress",
      "category": "6. Progress Tracking Flow",
      "parameters": [],
      "responseExample": {
        "success": true,
        "data": {
          "overallProgress": 65,
          "completedChallenges": 28,
          "domains": [
            {
              "name": "frontend",
              "progress": 80,
              "challenges": 15
            },
            {
              "name": "algorithms",
              "progress": 60,
              "challenges": 10
            }
          ],
          "timeline": [
            {
              "date": "2023-05-01",
              "progress": 45
            },
            {
              "date": "2023-06-01",
              "progress": 65
            }
          ]
        }
      }
    },

    // Adaptive learning flow
    {
      "name": "1. Get Adaptive Recommendations",
      "method": "GET",
      "path": "/api/v1/adaptive/profile",
      "description": "Step 1: Get AI-powered learning recommendations",
      "category": "7. Adaptive Learning Flow",
      "parameters": [],
      "responseExample": {
        "success": true,
        "data": {
          "recommendedChallenges": [
            {
              "id": "c4",
              "title": "Dynamic Programming Basics",
              "relevance": 0.95,
              "reason": "Based on your progress in algorithms"
            },
            {
              "id": "c5",
              "title": "Responsive Design Challenge",
              "relevance": 0.85,
              "reason": "Matches your learning style and interests"
            }
          ],
          "learningProfile": {
            "strengths": ["problem-solving", "creativity"],
            "areasForImprovement": ["time complexity optimization"],
            "lastUpdated": "2023-06-05T11:20:00Z"
          },
          "nextSteps": [
            "Complete the Dynamic Programming challenge",
            "Review your previous algorithms submissions"
          ]
        }
      }
    },

    // User journey events flow
    {
      "name": "1. Get Learning Journey Events",
      "method": "GET",
      "path": "/api/v1/user-journey/events",
      "description": "Step 1: View your learning journey timeline",
      "category": "8. User Journey Flow",
      "parameters": [
        {
          "name": "startDate",
          "in": "query",
          "required": false,
          "type": "string",
          "description": "Start date (YYYY-MM-DD)",
          "format": "date",
          "example": "2023-05-01"
        },
        {
          "name": "endDate",
          "in": "query",
          "required": false,
          "type": "string",
          "description": "End date (YYYY-MM-DD)",
          "format": "date",
          "example": "2023-06-30"
        }
      ],
      "responseExample": {
        "success": true,
        "data": {
          "events": [
            {
              "id": "evt1",
              "type": "challenge_completed",
              "timestamp": "2023-06-01T14:30:00Z",
              "details": {
                "challengeId": "c3",
                "score": 95
              }
            },
            {
              "id": "evt2",
              "type": "assessment_completed",
              "timestamp": "2023-05-20T09:15:00Z",
              "details": {
                "assessmentType": "personality",
                "insights": ["visual_learner", "creative_thinker"]
              }
            }
          ],
          "pagination": {
            "total": 15,
            "count": 2
          }
        }
      }
    },

    // System checks
    {
      "name": "API Health Check",
      "method": "GET",
      "path": "/api/v1/health",
      "description": "Check the health status of the API",
      "category": "9. System",
      "parameters": [],
      "responseExample": {
        "status": "ok",
        "mode": "development"
      }
    }
  ]
} 