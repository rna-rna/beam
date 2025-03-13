import express, { Router } from 'express';
import { db } from '@db';
import { comments, commentReactions } from '@db/schema';
import { eq } from 'drizzle-orm';
import { pusher } from '../pusherConfig';

const router = Router();

// Update comment position endpoint
router.put('/api/comments/:commentId/position', async (req, res) => {
  try {
    console.log("Comment position update request:", { 
      params: req.params, 
      body: req.body,
      authHeader: !!req.headers.authorization,
      hasAuth: !!req.auth,
      userId: req.auth?.userId
    });

    const commentId = parseInt(req.params.commentId);
    const { x, y } = req.body;

    // Extract user ID from auth token (from Clerk)
    let userId;
    try {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          // Try to extract user ID from JWT token
          // This depends on how your auth system works
          const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = tokenData.sub;
          console.log("Extracted user ID from token:", userId);

          // Attach to req.auth if it doesn't exist
          if (!req.auth) {
            req.auth = { userId };
          }
        }
      }
    } catch (error) {
      console.error("Failed to extract user ID from token:", error);
    }

    if (!req.auth?.userId) {
      console.error("Authentication missing for comment position update", {
        headers: Object.keys(req.headers),
        cookies: req.headers.cookie ? 'present' : 'missing',
        authHeader: req.headers.authorization,
        extractedUserId: userId || 'none'
      });
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate input
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
      return res.status(400).json({ message: 'Invalid position values', details: { x, y, types: { x: typeof x, y: typeof y } } });
    }

    // Find the comment
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (comment.userId !== req.auth.userId) {
      return res.status(403).json({ 
        message: 'Only the comment author can update its position',
        details: { commentUserId: comment.userId, requestUserId: req.auth.userId }
      });
    }

    // Log detailed position information before update
    console.log("Updating comment position:", {
      commentId,
      xPosition: x,
      yPosition: y,
      userId: req.auth?.userId,
      commentOwner: comment.userId,
      isOwner: comment.userId === req.auth?.userId,
      timestamp: new Date().toISOString()
    });

    // Update the comment position
    await db.update(comments)
      .set({ 
        xPosition: x, 
        yPosition: y,
        updatedAt: new Date()
      })
      .where(eq(comments.id, commentId));

    // Verify the update was successful
    const updatedComment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    console.log("Comment position after update:", {
      commentId,
      xPosition: updatedComment?.xPosition,
      yPosition: updatedComment?.yPosition
    });

    // Notify clients about the position update
    if (comment.imageId) {
      pusher.trigger(`image-${comment.imageId}`, 'comment-position-updated', {
        commentId,
        x,
        y,
        userId: req.auth.userId
      });
    }

    console.log("Comment position updated successfully:", { commentId, x, y });

    return res.status(200).json({ 
      message: 'Comment position updated successfully',
      data: {
        commentId,
        x,
        y
      }
    });
  } catch (error: unknown) {
    console.error('Error updating comment position:', error);
    return res.status(500).json({ 
      message: 'Failed to update comment position', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Edit comment content endpoint
router.put('/api/comments/:commentId', async (req, res) => {
  try {
    console.log("Comment edit request:", { 
      params: req.params, 
      body: req.body,
      authHeader: !!req.headers.authorization,
      hasAuth: !!req.auth,
      userId: req.auth?.userId
    });

    const commentId = parseInt(req.params.commentId);
    const { content } = req.body;

    // Extract user ID from auth token (from Clerk)
    let userId;
    try {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          // Try to extract user ID from JWT token
          const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = tokenData.sub;
          console.log("Extracted user ID from token:", userId);

          // Attach to req.auth if it doesn't exist
          if (!req.auth) {
            req.auth = { userId };
          }
        }
      }
    } catch (error) {
      console.error("Failed to extract user ID from token:", error);
    }

    if (!req.auth?.userId) {
      console.error("Authentication missing for comment edit", {
        headers: Object.keys(req.headers),
        cookies: req.headers.cookie ? 'present' : 'missing',
        authHeader: req.headers.authorization,
        extractedUserId: userId || 'none'
      });
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate input
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    // Find the comment
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (comment.userId !== req.auth.userId) {
      return res.status(403).json({ 
        message: 'Only the comment author can edit the comment',
        details: { commentUserId: comment.userId, requestUserId: req.auth.userId }
      });
    }

    // Update the comment content
    await db.update(comments)
      .set({ 
        content: content.trim(), 
        updatedAt: new Date()
      })
      .where(eq(comments.id, commentId));

    // Verify the update was successful
    const updatedComment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    // Notify clients about the content update
    if (comment.imageId) {
      pusher.trigger(`image-${comment.imageId}`, 'comment-updated', {
        commentId,
        content: updatedComment?.content,
        userId: req.auth.userId
      });
    }

    console.log("Comment updated successfully:", { commentId, content: updatedComment?.content });

    return res.status(200).json({ 
      message: 'Comment updated successfully',
      data: updatedComment
    });
  } catch (error: unknown) {
    console.error('Error updating comment:', error);
    return res.status(500).json({ 
      message: 'Failed to update comment', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Delete comment endpoint
router.delete('/api/comments/:commentId', async (req, res) => {
  try {
    console.log("Comment delete request:", { 
      params: req.params,
      authHeader: !!req.headers.authorization,
      hasAuth: !!req.auth,
      userId: req.auth?.userId
    });

    const commentId = parseInt(req.params.commentId);

    // Extract user ID from auth token (from Clerk)
    let userId;
    try {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          // Try to extract user ID from JWT token
          const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = tokenData.sub;
          console.log("Extracted user ID from token:", userId);

          // Attach to req.auth if it doesn't exist
          if (!req.auth) {
            req.auth = { userId };
          }
        }
      }
    } catch (error) {
      console.error("Failed to extract user ID from token:", error);
    }

    if (!req.auth?.userId) {
      console.error("Authentication missing for comment deletion", {
        headers: Object.keys(req.headers),
        cookies: req.headers.cookie ? 'present' : 'missing',
        authHeader: req.headers.authorization,
        extractedUserId: userId || 'none'
      });
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find the comment
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (comment.userId !== req.auth.userId) {
      return res.status(403).json({ 
        message: 'Only the comment author can delete the comment',
        details: { commentUserId: comment.userId, requestUserId: req.auth.userId }
      });
    }

    const imageId = comment.imageId;

    // Delete associated comment reactions first
    await db.delete(commentReactions).where(eq(commentReactions.commentId, commentId));

    // Delete the comment
    await db.delete(comments)
      .where(eq(comments.id, commentId));

    // Notify clients about the deletion
    if (imageId) {
      pusher.trigger(`image-${imageId}`, 'comment-deleted', {
        commentId,
        userId: req.auth.userId
      });
    }

    console.log("Comment deleted successfully:", { commentId });

    return res.status(200).json({ 
      message: 'Comment deleted successfully',
      data: { commentId }
    });
  } catch (error: unknown) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ 
      message: 'Failed to delete comment', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;