
import { Router } from "express";
import { pusher } from "../pusherConfig";
import { extractUserInfo } from "../auth";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { fetchCachedUserData } from "../lib/userCache";

const router = Router();

// Apply Clerk auth middleware specifically to this route
router.post("/pusher/auth", ClerkExpressRequireAuth(), async (req, res) => {
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
    // Get authenticated user info using our helper
    const userInfo = await extractUserInfo(req);
    
    // Get cached user data with color
    const [cachedUser] = await fetchCachedUserData([userInfo.userId]);
    
    const presenceData = {
      user_id: userInfo.userId,
      user_info: {
        name: cachedUser 
          ? `${cachedUser.firstName || ""} ${cachedUser.lastName || ""}`.trim() 
          : "Anonymous",
        avatar: cachedUser?.imageUrl || "/fallback-avatar.png",
        color: cachedUser?.color || "#ccc",
      },
    };

    const auth = pusher.authorizeChannel(
      req.body.socket_id, 
      req.body.channel_name, 
      presenceData
    );
    
    console.log("Auth Response Generated:", {
      userId: userInfo.userId,
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
