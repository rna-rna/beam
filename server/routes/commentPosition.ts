import express, { Router } from 'express';
import { db } from '@db';
import { comments } from '@db/schema';
import { eq } from 'drizzle-orm';
import { pusher } from '../pusherConfig';

const router = Router();

// Update comment position endpoint
router.put('/api/comments/:commentId/position', async (req, res) => {
  try {
    console.log("Comment position update request:", { params: req.params, body: req.body });
    
    const commentId = parseInt(req.params.commentId);
    const { x, y } = req.body;
    
    if (!req.auth?.userId) {
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
    
    // Log position values before update
    console.log("Updating comment position:", {
      commentId,
      xPosition: x,
      yPosition: y,
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
  } catch (error) {
    console.error('Error updating comment position:', error);
    return res.status(500).json({ message: 'Failed to update comment position', error: error.message });
  }
});

export default router; 