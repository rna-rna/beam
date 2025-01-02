
import { pgTable, text, serial, timestamp, integer, boolean, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from 'drizzle-orm';

export const galleries = pgTable('galleries', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  title: text('title').default('Untitled Project').notNull(),
  userId: text('user_id').notNull(), // Clerk user ID
  isPublic: boolean('is_public').default(false).notNull(),
  guestUpload: boolean('guest_upload').default(false).notNull(),
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
  approved: boolean('approved').default(false).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  position: integer('position').default(0),
  starred: boolean('starred').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const stars = pgTable('stars', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  userId: text('user_id').notNull(), // Clerk user ID
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  imageUserIdx: index('stars_image_user_idx').on(table.imageId, table.userId),
  userIdIdx: index('stars_user_id_idx').on(table.userId)
}));

export const annotations = pgTable('annotations', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  content: text('content').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const recentlyViewedGalleries = pgTable('recently_viewed_galleries', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  galleryId: integer('gallery_id').references(() => galleries.id).notNull(),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull()
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  content: text('content').notNull(),
  xPosition: double('x_position').notNull(),
  yPosition: double('y_position').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userImageUrl: text('user_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  imageIdIdx: index('comments_image_id_idx').on(table.imageId),
  userIdIdx: index('comments_user_id_idx').on(table.userId)
}));

// Define relationships
export const galleriesRelations = relations(galleries, ({ many }) => ({
  images: many(images)
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  gallery: one(galleries, {
    fields: [images.galleryId],
    references: [galleries.id]
  }),
  comments: many(comments),
  stars: many(stars)
}));

export const starsRelations = relations(stars, ({ one }) => ({
  image: one(images, {
    fields: [stars.imageId],
    references: [images.id]
  })
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  image: one(images, {
    fields: [comments.imageId],
    references: [images.id]
  })
}));

// Create schemas for validation
export const insertGallerySchema = createInsertSchema(galleries);
export const selectGallerySchema = createSelectSchema(galleries);
export const insertImageSchema = createInsertSchema(images);
export const selectImageSchema = createSelectSchema(images);
export const insertStarSchema = createInsertSchema(stars);
export const selectStarSchema = createSelectSchema(stars);
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);

// Export types
export type Gallery = typeof galleries.$inferSelect;
export type NewGallery = typeof galleries.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Star = typeof stars.$inferSelect;
export type NewStar = typeof stars.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
