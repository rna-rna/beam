
import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { comments } from '../db/schema';
import { authenticateRequest } from '../auth';
import { eq, and } from 'drizzle-orm';

export async function updateCommentPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = Number(req.params.id);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const { xPosition, yPosition } = req.body;
    if (typeof xPosition !== 'number' || typeof yPosition !== 'number') {
      return res.status(400).json({ error: 'Invalid position values' });
    }

    // Get the auth user ID
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the comment exists and is owned by this user
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only reposition your own comments' });
    }

    // Update the comment position
    await db.update(comments)
      .set({ 
        xPosition,
        yPosition
      })
      .where(eq(comments.id, commentId));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating comment position:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
