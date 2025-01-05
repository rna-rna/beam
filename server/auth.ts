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
  const user = req.auth?.user;
  const sessionId = req.auth?.sessionId;

  // Log debug information
  console.log('Debug - Extracting user info:', {
    hasAuth: !!req.auth,
    hasUser: !!user,
    sessionId,
    headers: req.headers['authorization'] ? 'present' : 'missing'
  });

  // Handle authenticated users
  if (user) {
    const userName = user.firstName ? 
      `${user.firstName} ${user.lastName || ''}`.trim() : 
      (user.username || 'Anonymous');

    return {
      userId: user.id,
      userName,
      userImageUrl: user.imageUrl || '/fallback-avatar.png'
    };
  }

  // Handle guest users with session
  if (sessionId) {
    return {
      userId: `guest_${sessionId}`,
      userName: "Guest",
      userImageUrl: '/fallback-avatar.png'
    };
  }

  // Handle anonymous users
  const guestId = `guest_${Math.random().toString(36).slice(2, 9)}`;
  return {
    userId: guestId,
    userName: "Guest",
    userImageUrl: '/fallback-avatar.png'
  };

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

  // Get user's profile image directly from Clerk user object
  const userImageUrl = user.imageUrl || null;

  console.log('Debug - Extracted user info:', {
    userId: req.auth.userId,
    userName,
    hasImage: !!userImageUrl,
    imageUrl: userImageUrl
  });

  return {
    userId: req.auth.userId,
    userName,
    userImageUrl: userImageUrl // Using primary imageUrl from Clerk
  };
}