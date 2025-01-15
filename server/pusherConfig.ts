
import Pusher from "pusher";

if (!process.env.PUSHER_APP_ID) {
  console.error('Missing PUSHER_APP_ID in environment variables');
  throw new Error('PUSHER_APP_ID is required');
}

if (!process.env.PUSHER_KEY) {
  console.error('Missing PUSHER_KEY in environment variables');
  throw new Error('PUSHER_KEY is required');
}

if (!process.env.PUSHER_SECRET) {
  throw new Error('PUSHER_SECRET is required');
}

if (!process.env.PUSHER_CLUSTER) {
  throw new Error('PUSHER_CLUSTER is required');
}

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});
