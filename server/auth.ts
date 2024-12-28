import { ClerkExpressRequireAuth, ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';
import { type Express } from "express";

// Ensure required environment variables are present
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}

export function setupClerkAuth(app: Express) {
  // Add enhanced debug logging
  console.log('[Auth Setup] Initializing Clerk authentication...');

  // Initialize Clerk middleware with enhanced debug logging
  app.use((req, res, next) => {
    console.log(`[Auth Debug] Incoming request to ${req.path}`, {
      hasAuth: !!req.headers.authorization,
      method: req.method,
      query: req.query
    });
    next();
  });

  app.use(ClerkExpressWithAuth({
    onError: (err) => {
      console.error('[Clerk Auth Error]', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      return null; // Allow request to continue for public routes
    }
  }));

  // Configure protected routes middleware with enhanced error handling
  const protectedMiddleware = ClerkExpressRequireAuth({
    onError: (error: any) => {
      console.error('[Protected Route Error]:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return {
        success: false,
        message: 'Authentication required',
        details: error.message
      };
    }
  });

  return protectedMiddleware;
}

// Enhanced helper to extract user information from Clerk session
export async function extractUserInfo(req: any) {
  try {
    console.log('[Auth Debug] Extracting user info:', {
      hasAuth: !!req.auth,
      hasUserId: !!req.auth?.userId,
      headers: !!req.headers.authorization,
      path: req.path
    });

    if (!req.auth) {
      throw new Error('Authentication required');
    }

    if (!req.auth.userId) {
      throw new Error('User ID not found in session');
    }

    // Fetch user details from Clerk with error handling
    let user;
    try {
      user = await clerkClient.users.getUser(req.auth.userId);
    } catch (error: any) {
      console.error('[Clerk API Error]', {
        message: error.message,
        userId: req.auth.userId
      });
      throw new Error('Failed to fetch user details');
    }

    if (!user) {
      throw new Error('User not found');
    }

    // Get user display name using available fields
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const username = user.username;
    const email = user.emailAddresses?.[0]?.emailAddress;

    // Determine best display name to use
    const userName = firstName && lastName ? 
      `${firstName} ${lastName}` : 
      username || 
      email || 
      'Unknown User';

    // Get user's profile image if available
    const userImageUrl = user.imageUrl || user.profileImageUrl;

    const userInfo = {
      userId: req.auth.userId,
      userName,
      userImageUrl
    };

    console.log('[Auth Debug] Successfully extracted user info:', {
      userId: userInfo.userId,
      hasName: !!userInfo.userName,
      hasImage: !!userInfo.userImageUrl
    });

    return userInfo;
  } catch (error: any) {
    console.error('[Auth Debug] Error extracting user info:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}