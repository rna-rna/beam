import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { fetchCachedUserData } from './lib/userCache';
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

  // Fetch user details from cache if not available in auth
  let user = req.auth.user;
  if (!user) {
    try {
      const [cached] = await fetchCachedUserData([req.auth.userId]);
      if (!cached) {
        console.error('Debug - No user found in cache:', req.auth.userId);
        throw new Error('User not found');
      }
      user = {
        id: cached.userId,
        firstName: cached.firstName || '',
        lastName: cached.lastName || '',
        imageUrl: cached.imageUrl,
        username: null,
        emailAddresses: []
      };
      console.log('Debug - Retrieved user from cache:', {
        userId: user.id,
        hasUser: !!user
      });
    } catch (error) {
      console.error('Debug - Failed to fetch user from cache:', error);
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