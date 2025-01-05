
import { Router } from "express";
import { pusher } from "../pusherConfig";
import { extractUserInfo } from "../auth";

const router = Router();

router.post("/pusher/auth", async (req, res) => {
  console.log("Pusher Auth Request:", {
    socketId: req.body.socket_id,
    channel: req.body.channel_name,
    hasUser: !!req.auth?.userId,
    sessionId: req.auth?.sessionId
  });

  if (!req.body.socket_id || !req.body.channel_name) {
    return res.status(400).json({
      error: "Missing socket_id or channel_name",
      code: "INVALID_PARAMS"
    });
  }

  try {
    let presenceData;
    
    if (req.auth?.userId) {
      // Handle authenticated users
      const userInfo = await extractUserInfo(req);
      presenceData = {
        user_id: userInfo.userId,
        user_info: {
          name: userInfo.userName,
          avatar: userInfo.userImageUrl || `/fallback-avatar.png`,
          isGuest: false
        },
      };
    } else if (req.auth?.sessionId) {
      // Handle anonymous but sessioned guests
      const sessionInfo = await extractUserInfo(req);
      presenceData = {
        user_id: `guest_${req.auth.sessionId}`,
        user_info: {
          name: sessionInfo.userName || "Guest",
          avatar: sessionInfo.userImageUrl || `/fallback-avatar.png`,
          isGuest: true
        },
      };
    } else {
      // True anonymous users
      const guestId = `guest_${Math.random().toString(36).slice(2, 9)}`;
      presenceData = {
        user_id: guestId,
        user_info: {
          name: "Guest",
          avatar: `/fallback-avatar.png`,
          isGuest: true
        },
      };
    }

    const auth = pusher.authorizeChannel(
      req.body.socket_id, 
      req.body.channel_name, 
      presenceData
    );
    
    console.log("Auth Response Generated:", {
      userId: presenceData.user_id,
      channel: req.body.channel_name,
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
