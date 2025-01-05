
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

  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  try {
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
    const auth = pusher.authorizeChannel(socketId, channel, presenceData);
    
    console.log("Pusher Auth Response:", {
      auth_payload: auth,
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
    
    res.send(auth);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(403).json({ 
      error: 'Unauthorized',
      details: error.message
    });
  }
});

export default router;
