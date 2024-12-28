import { ClerkExpressRequireAuth, ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';
import { type Express } from "express";

// Ensure required environment variables are present
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}

export function setupClerkAuth(app: Express) {
  // Add debug logging
  console.log('Setting up Clerk authentication...');

  // Initialize Clerk middleware with debug logging
  app.use((req, res, next) => {
    console.log(`[Auth Debug] Incoming request to ${req.path}`);
    next();
  });

  app.use(ClerkExpressWithAuth({
    onError: (err) => {
      console.error('[Clerk Auth Error]', err);
      return null; // Allow request to continue for public routes
    }
  }));

  // Configure protected routes middleware with proper error handling
  const protectedMiddleware = ClerkExpressRequireAuth({
    onError: (error: any) => {
      console.error('[Protected Route Error]:', error);
      return {
        success: false,
        message: 'Authentication required',
        details: error.message
      };
    }
  });

  return protectedMiddleware;
}

// Helper to extract user information from Clerk session
export async function extractUserInfo(req: any) {
  try {
    console.log('[Auth Debug] Extracting user info:', {
      hasAuth: !!req.auth,
      hasUserId: !!req.auth?.userId,
      headers: !!req.headers.authorization
    });

    if (!req.auth) {
      throw new Error('Authentication required');
    }

    if (!req.auth.userId) {
      throw new Error('User ID not found in session');
    }

    // Fetch user details from Clerk
    const user = await clerkClient.users.getUser(req.auth.userId);

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

    return {
      userId: req.auth.userId,
      userName,
      userImageUrl
    };
  } catch (error) {
    console.error('[Auth Debug] Error extracting user info:', error);
    throw error;
  }
}