
import { Router } from "express";
import { pusher } from "../pusherConfig";
import { nanoid } from "nanoid";
import { extractUserInfo } from "../auth";

const router = Router();

router.post("/pusher/auth", async (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  try {
    let userId, userName, userImageUrl;

    if (req.auth?.userId) {
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

    const auth = pusher.authorizeChannel(socketId, channel, presenceData);
    res.send(auth);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(403).json({ error: 'Unauthorized' });
  }
});

export default router;
