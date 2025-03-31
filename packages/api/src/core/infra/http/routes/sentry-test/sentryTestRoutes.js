/**
 * Sentry Test Routes
 *
 * This module provides test routes to verify Sentry error monitoring is working correctly.
 * These routes should only be enabled in non-production environments.
 */

import express from 'express';
import * as Sentry from '@sentry/node';
'../../../monitoring/sentry.js268;
import https from ''https';

const router = express.Router();

/**
 * Test route that triggers a captured exception
 */
router.get('/exception', (req, res) => {
  try {
    // Deliberately throw an error for testing
    throw new Error('Test error for Sentry monitoring');
  } catch (error) {
    // Capture the error with Sentry
    const eventId = captureError(error, {
      user: { id: 'test-user-id' },
      context: { route: '/sentry-test/exception' }
    });

    res.json({
      message: 'Error captured by Sentry',
      eventId,
      success: !!eventId, // true if Sentry captured the error
      error: error.message
    });
  }
});

/**
 * Test route that triggers a direct exception without try/catch
 * This tests the global error handler integration with Sentry
 */
router.get('/unhandled', () => {
  // This will trigger the global error handler which should report to Sentry
  throw new Error('Unhandled test error for Sentry monitoring');
});

/**
 * Test route that sends a message to Sentry
 */
router.get('/message', (req, res) => {
  const level = req.query.level || 'info';
  const message = `Test message for Sentry monitoring (${level})`;

  const eventId = captureMessage(message, {
    user: { id: 'test-user-id' },
    context: { route: '/sentry-test/message' }
  }, level);

  res.json({
    message: 'Message sent to Sentry',
    eventId,
    success: !!eventId, // true if Sentry captured the message
    level
  });
});

/**
 * Route to fetch recent issues from Sentry API
 * This can be used by a dashboard to display current issues
 */
router.get('/issues', async (req, res) => {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = 'biji-biji-non-profits';
  const project = 'ai-game';

  if (!token) {
    return res.status(500).json({
      error: 'Sentry API token not configured',
      message: 'Set SENTRY_AUTH_TOKEN in your environment'
    });
  }

  try {
    // Use the Sentry API to get recent issues
    const options = {
      hostname: 'sentry.io',
      path: `/api/0/projects/${org}/${project}/issues/?statuses=unresolved&limit=100`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const sentryRequest = https.request(options, (sentryRes) => {
      let data = '';

      sentryRes.on('data', (chunk) => {
        data += chunk;
      });

      sentryRes.on('end', () => {
        if (sentryRes.statusCode >= 200 && sentryRes.statusCode < 300) {
          try {
            const issues = JSON.parse(data);
            res.json(issues);
          } catch (e) {
            res.status(500).json({
              error: 'Failed to parse Sentry response',
              message: e.message
            });
          }
        } else {
          res.status(sentryRes.statusCode).json({
            error: 'Sentry API error',
            message: data
          });
        }
      });
    });

    sentryRequest.on('error', (error) => {
      res.status(500).json({
        error: 'Failed to connect to Sentry API',
        message: error.message
      });
    });

    sentryRequest.end();
  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error',
      message: error.message
    });
  }
});

/**
 * Test route that adds breadcrumbs and context before triggering an error
 */
router.get('/breadcrumbs', (req, res) => {
  // Add user context
  Sentry.setUser({
    id: 'test-user-123',
    email: 'test@example.com',
    username: 'test_user'
  });

  // Add tags for filtering
  Sentry.setTag('test_tag', 'true');
  Sentry.setTag('environment', process.env.NODE_ENV);

  // Add breadcrumbs to trace activity
  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'User authenticated',
    level: 'info'
  });

  Sentry.addBreadcrumb({
    category: 'api',
    message: 'Sentry test started',
    level: 'info',
    data: {
      requestTime: new Date().toISOString()
    }
  });

  try {
    // Simulate something going wrong after several operations
    const testObject = null;
    // This will trigger an error
    testObject.nonExistentMethod();
  } catch (error) {
    // Capture with all the context we've built up
    const eventId = captureError(error, {
      extra: {
        route: '/sentry-test/breadcrumbs',
        testDetails: 'Testing full Sentry context'
      }
    });

    res.json({
      message: 'Error with breadcrumbs captured by Sentry',
      eventId,
      success: !!eventId
    });
  }
});

/**
 * Create Sentry test routes - only for non-production environments
 */
export default function createSentryTestRoutes() {
  // For security, these routes should be disabled in production
  if (process.env.NODE_ENV === 'production') {
    const prodRouter = express.Router();
    prodRouter.all('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'Sentry test routes are disabled in production'
      });
    });
    return prodRouter;
  }

  return router;
}
