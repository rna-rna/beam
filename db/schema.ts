import { pgTable, text, serial, timestamp, integer, boolean, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from 'drizzle-orm';

export const galleries = pgTable('galleries', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  title: text('title').default('Untitled Project').notNull(),
  userId: text('user_id').notNull(), // Clerk user ID
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('galleries_user_id_idx').on(table.userId)
}));

export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  galleryId: integer('gallery_id').references(() => galleries.id).notNull(),
  url: text('url').notNull(),
  publicId: text('public_id').notNull(),
  originalFilename: text('original_filename'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  starred: boolean('starred').default(false).notNull(),
  approved: boolean('approved').default(false).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  position: integer('position').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  content: text('content').notNull(),
  xPosition: real('x_position').notNull(),
  yPosition: real('y_position').notNull(),
  userId: text('user_id').notNull(), // Clerk user ID
  userName: text('user_name').notNull(),
  userImageUrl: text('user_image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  imageIdIdx: index('comments_image_id_idx').on(table.imageId),
  userIdIdx: index('comments_user_id_idx').on(table.userId)
}));

// New table for tracking recently viewed galleries
export const recentlyViewedGalleries = pgTable('recently_viewed_galleries', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  galleryId: integer('gallery_id').references(() => galleries.id).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull()
}, (table) => ({
  userGalleryIdx: index('recently_viewed_user_gallery_idx').on(table.userId, table.galleryId),
  viewedAtIdx: index('recently_viewed_viewed_at_idx').on(table.viewedAt)
}));

// Define relationships
export const galleriesRelations = relations(galleries, ({ many }) => ({
  images: many(images),
  recentlyViewed: many(recentlyViewedGalleries)
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  gallery: one(galleries, {
    fields: [images.galleryId],
    references: [galleries.id]
  }),
  comments: many(comments)
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  image: one(images, {
    fields: [comments.imageId],
    references: [images.id]
  })
}));

export const recentlyViewedGalleriesRelations = relations(recentlyViewedGalleries, ({ one }) => ({
  gallery: one(galleries, {
    fields: [recentlyViewedGalleries.galleryId],
    references: [galleries.id]
  })
}));

// Create schemas for validation
export const insertGallerySchema = createInsertSchema(galleries);
export const selectGallerySchema = createSelectSchema(galleries);
export const insertImageSchema = createInsertSchema(images);
export const selectImageSchema = createSelectSchema(images);
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);
export const insertRecentlyViewedSchema = createInsertSchema(recentlyViewedGalleries);
export const selectRecentlyViewedSchema = createSelectSchema(recentlyViewedGalleries);

// Export types
export type Gallery = typeof galleries.$inferSelect;
export type NewGallery = typeof galleries.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type RecentlyViewedGallery = typeof recentlyViewedGalleries.$inferSelect;
export type NewRecentlyViewedGallery = typeof recentlyViewedGalleries.$inferInsert;