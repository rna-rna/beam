import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
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

  // Debug middleware to log auth state
  app.use((req: any, _res: Response, next: NextFunction) => {
    console.log('Debug - Auth Middleware:', {
      path: req.path,
      method: req.method,
      hasAuth: !!req.auth,
      headers: req.headers['authorization'] ? 'present' : 'missing'
    });

    if (!req.auth) {
      return _res.status(401).json({
        success: false,
        message: 'Authentication required',
        details: 'Please sign in to access this resource'
      });
    }

    next();
  });

  return protectedMiddleware;
}

// Helper to extract user information from Clerk session
export function extractUserInfo(req: any) {
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

  const user = req.auth.user;
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