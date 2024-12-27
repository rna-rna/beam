import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { type Express, Response } from "express";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}

export function setupClerkAuth(app: Express) {
  // Initialize Clerk middleware for all routes to attach session data
  app.use(ClerkExpressWithAuth());

  // Configure protected routes middleware with proper error handling and debug logging
  const protectedMiddleware = ClerkExpressRequireAuth({
    onError: (err: any, _req: any, res: Response) => {
      console.error('Clerk Auth Error:', err);
      res.status(401).json({
        success: false,
        message: 'Authentication failed',
        details: err.message
      });
    }
  });

  app.use((req: any, _res, next) => {
    console.log('Debug - Auth Middleware:', {
      hasAuth: !!req.auth,
      hasUser: !!req.auth?.user,
      userId: req.auth?.userId,
      path: req.path
    });
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