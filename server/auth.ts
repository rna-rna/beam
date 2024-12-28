import { ClerkExpressRequireAuth, ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';
import { type Express, Response, NextFunction } from "express";

// Ensure required environment variables are present
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}

export function setupClerkAuth(app: Express) {
  // Initialize Clerk middleware without extra options as they're read from env
  app.use(ClerkExpressWithAuth());

  // Configure protected routes middleware with proper error handling
  const protectedMiddleware = ClerkExpressRequireAuth({
    onError: (error: any) => {
      console.error('Clerk Auth Error:', error);
      return {
        success: false,
        message: 'Authentication failed',
        details: error.message
      };
    }
  });

  return protectedMiddleware;
}

// Helper to extract user information from Clerk session
export async function extractUserInfo(req: any) {
  console.log('Debug - Extracting user info:', {
    hasAuth: !!req.auth,
    hasUser: !!req.auth?.user,
    userId: req.auth?.userId,
    session: !!req.session,
    headers: req.headers['authorization'] ? 'present' : 'missing'
  });

  if (!req.auth) {
    console.error('Debug - No auth object found:', {
      headers: req.headers
    });
    throw new Error('Authentication required');
  }

  if (!req.auth.userId) {
    throw new Error('User ID not found in session');
  }

  // Fetch user details from Clerk if not available in auth
  let user = req.auth.user;
  if (!user) {
    try {
      user = await clerkClient.users.getUser(req.auth.userId);
      console.log('Debug - Retrieved user from Clerk:', {
        userId: user.id,
        hasUser: !!user
      });
    } catch (error) {
      console.error('Debug - Failed to fetch user from Clerk:', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  console.log('Debug - User object:', {
    userId: req.auth.userId,
    hasUser: !!user,
    userFields: user ? Object.keys(user) : []
  });

  if (!user) {
    console.error('Debug - User extraction failed:', {
      auth: req.auth,
      headers: req.headers
    });
    throw new Error('User not found in session');
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

  console.log('Debug - Extracted user info:', {
    userId: req.auth.userId,
    userName,
    hasImage: !!userImageUrl
  });

  return {
    userId: req.auth.userId,
    userName,
    userImageUrl
  };
}