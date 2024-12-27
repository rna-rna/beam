import { clerkClient, createClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { type Express, Response, Request, NextFunction } from "express";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}

// Define type for authenticated request
export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    sessionId?: string;
    user?: any;
  };
}

export function setupClerkAuth(app: Express) {
  // Create Clerk middleware for protected routes
  const requireAuth = createClerkExpressRequireAuth({
    onError: (err: any, _req: Request, res: Response) => {
      console.error('Clerk Auth Error:', err);
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
  });

  // Debug middleware to log auth state
  app.use(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const sessionToken = req.headers.authorization?.split(' ')[1];
      if (sessionToken) {
        try {
          const sessions = await clerkClient.sessions.getSessionList({
            sessionId: [sessionToken]
          });
          if (sessions && sessions.length > 0) {
            const session = sessions[0];
            req.auth = {
              userId: session.userId,
              sessionId: session.id
            };
          }
        } catch (error) {
          console.error('Session verification failed:', error);
        }
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
    }

    console.log('Debug - Auth Middleware:', {
      path: req.path,
      method: req.method,
      hasAuth: !!req.auth,
      userId: req.auth?.userId
    });
    next();
  });

  return requireAuth;
}

// Helper to extract user information from Clerk session
export async function extractUserInfo(req: AuthenticatedRequest) {
  if (!req.auth?.userId) {
    console.error('Debug - User extraction failed:', {
      auth: req.auth,
      headers: req.headers
    });
    throw new Error('User not found in session');
  }

  // Get user details from session
  const userId = req.auth.userId;

  try {
    // Fetch user data from Clerk
    const user = await clerkClient.users.getUser(userId);
    return {
      userId,
      userName: user.firstName && user.lastName ? 
        `${user.firstName} ${user.lastName}`.trim() : 
        user.username || 'Anonymous User',
      userImageUrl: user.imageUrl
    };
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw new Error('Failed to fetch user data');
  }
}