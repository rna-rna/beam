
import { Router } from "express";
import { pusher } from "../pusherConfig";
import { nanoid } from "nanoid";
import { extractUserInfo } from "../auth";
import { clerkClient } from "@clerk/clerk-sdk-node";

const router = Router();

router.post("/pusher/auth", async (req, res) => {
  console.log("Pusher Auth Details:", {
    socketId: req.body.socket_id,
    channel: req.body.channel_name,
    auth: {
      sessionId: req.auth?.sessionId,
      userId: req.auth?.userId,
      status: req.auth?.sessionClaims?.status
    },
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      contentType: req.headers['content-type'],
      host: req.headers.host
    }
  });

  // Log session token data if available
  if (req.headers.authorization) {
    console.log("Authorization header present");
  }

  if (!req.body.socket_id || !req.body.channel_name) {
    return res.status(400).json({
      error: "Missing socket_id or channel_name",
      code: "INVALID_PARAMS"
    });
  }

  if (!req.auth?.sessionId) {
    console.error("No valid Clerk session found");
    return res.status(401).json({ 
      error: "Authentication required",
      code: "NO_SESSION"
    });
  }

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

    // Get authenticated user info
    const userInfo = await extractUserInfo(req);
    const presenceData = {
      user_id: userInfo.userId,
      user_info: {
        name: userInfo.userName,
        avatar: userInfo.userImageUrl || "/default-avatar.png",
      },
    };

    const auth = pusher.authorizeChannel(req.body.socket_id, req.body.channel_name, presenceData);
    
    console.log("Auth Response:", {
      auth_details: auth,
      timestamp: new Date().toISOString()
    });

    res.setHeader('Content-Type', 'application/json');
    return res.json(auth);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return res.status(403).json({ 
      error: 'Authorization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
