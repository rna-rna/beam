import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from 'drizzle-orm';

export const galleries = pgTable('galleries', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  galleryId: integer('gallery_id').references(() => galleries.id).notNull(),
  url: text('url').notNull(),
  publicId: text('public_id').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  flagged: boolean('flagged').default(false).notNull(),
  position: integer('position'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  content: text('content').notNull(),
  xPosition: real('x_position').notNull(), // Percentage of image width (0-100)
  yPosition: real('y_position').notNull(), // Percentage of image height (0-100)
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const galleriesRelations = relations(galleries, ({ many }) => ({
  images: many(images)
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

export const insertGallerySchema = createInsertSchema(galleries);
export const selectGallerySchema = createSelectSchema(galleries);
export const insertImageSchema = createInsertSchema(images);
export const selectImageSchema = createSelectSchema(images);
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);

export type Gallery = typeof galleries.$inferSelect;
export type NewGallery = typeof galleries.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
