import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { type Express, Response } from "express";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}

export function setupClerkAuth(app: Express) {
  // Configure protected routes middleware with proper error handling
  const protectedMiddleware = ClerkExpressRequireAuth({
    onError: (err, _req, res: Response) => {
      console.error('Clerk Auth Error:', err);
      res.status(401).json({
        success: false,
        message: 'Authentication failed',
        details: err.message
      });
    },
  });

  return protectedMiddleware;
}

// Helper to extract user information from Clerk session
export function extractUserInfo(req: any) {
  const user = req.auth?.user;

  if (!user) {
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

  return {
    userId: req.auth.userId,
    userName,
    userImageUrl
  };
}