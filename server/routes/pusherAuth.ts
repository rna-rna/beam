import { Router } from "express";
import { pusher } from "../pusherConfig";
import { nanoid } from "nanoid";
import { extractUserInfo } from "../auth";
import { clerkClient } from "@clerk/clerk-sdk-node";

const router = Router();

router.post("/pusher/auth", async (req, res) => {
  console.log("Pusher Auth Request:", {
    socketId: req.body.socket_id,
    channel: req.body.channel_name,
    headers: req.headers,
    hasAuth: !!req.auth,
    sessionStatus: req.auth?.sessionClaims?.status
  });

  if (!req.auth?.sessionId) {
    console.error("No valid Clerk session found");
    return res.status(401).json({ 
      error: "Authentication required",
      code: "NO_SESSION"
    });
  }

  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  try {
    // Verify session is active
    const session = await clerkClient.sessions.getSession(req.auth.sessionId);
    if (session.status !== "active") {
      console.error("Session not active:", session.status);
      return res.status(401).json({ 
        error: "Session expired",
        code: "SESSION_EXPIRED"
      });
    }
    let userId, userName, userImageUrl;

    if (req.auth?.userId) {
      // Verify session status
      const session = await clerkClient.sessions.getSession(req.auth.sessionId);
      
      if (session.status === "expired") {
        console.log("Session expired, returning 401");
        return res.status(401).json({ 
          error: "Session expired",
          code: "SESSION_EXPIRED"
        });
      }

      // Get authenticated user info
      const userInfo = await extractUserInfo(req);
      userId = userInfo.userId;
      userName = userInfo.userName;
      userImageUrl = userInfo.userImageUrl;
    } else {
      // Generate guest ID
      userId = `guest_${nanoid(10)}`;
      userName = "Guest User";
      userImageUrl = "/default-avatar.png";
    }

    const presenceData = {
      user_id: userId,
      user_info: {
        name: userName,
        avatar: userImageUrl,
      },
    };

    // Use authorizeChannel instead of authenticate
    try {
      const auth = pusher.authorizeChannel(socketId, channel, presenceData);
      
      console.log("Pusher Auth Response:", {
        raw_auth: auth,
        auth_signature: auth?.auth,
        channel_data: auth?.channel_data,
        request_details: {
          socketId,
          channel,
          presenceData
        },
        user_context: {
          userId,
          userName,
          userImageUrl
        },
        timestamp: new Date().toISOString()
      });
      
      res.setHeader('Content-Type', 'application/json');
      res.json(auth);
    } catch (error) {
      console.error("Pusher Auth Error:", {
        error: error.message,
        stack: error.stack,
        context: {
          socketId,
          channel,
          userId
        }
      });
      res.status(403).json({ 
        error: 'Authorization failed',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(403).json({ 
      error: 'Unauthorized',
      details: error.message
    });
  }
});

export default router;