import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const galleries = pgTable('galleries', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  title: text('title').default('Untitled Project').notNull(),
  userId: integer('user_id').references(() => users.id),  // Add user relation
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  galleryId: integer('gallery_id').references(() => galleries.id).notNull(),
  url: text('url').notNull(),
  publicId: text('public_id').notNull(),
  originalFilename: text('original_filename'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  starred: boolean('starred').default(false).notNull(),
  position: integer('position').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const annotations = pgTable('annotations', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  pathData: text('path_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  imageId: integer('image_id').references(() => images.id).notNull(),
  annotationId: integer('annotation_id').references(() => annotations.id),
  content: text('content').notNull(),
  xPosition: real('x_position').notNull(),
  yPosition: real('y_position').notNull(),
  author: text('author').default('Anonymous'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  galleries: many(galleries)
}));

export const galleriesRelations = relations(galleries, ({ many, one }) => ({
  images: many(images),
  user: one(users, {
    fields: [galleries.userId],
    references: [users.id]
  })
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  gallery: one(galleries, {
    fields: [images.galleryId],
    references: [galleries.id]
  }),
  comments: many(comments),
  annotations: many(annotations)
}));

export const annotationsRelations = relations(annotations, ({ one, many }) => ({
  image: one(images, {
    fields: [annotations.imageId],
    references: [images.id]
  }),
  comments: many(comments)
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  image: one(images, {
    fields: [comments.imageId],
    references: [images.id]
  }),
  annotation: one(annotations, {
    fields: [comments.annotationId],
    references: [annotations.id]
  })
}));

// Create schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertGallerySchema = createInsertSchema(galleries);
export const selectGallerySchema = createSelectSchema(galleries);
export const insertImageSchema = createInsertSchema(images);
export const selectImageSchema = createSelectSchema(images);
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);
export const insertAnnotationSchema = createInsertSchema(annotations);
export const selectAnnotationSchema = createSelectSchema(annotations);

// Export types
export type Gallery = typeof galleries.$inferSelect;
export type NewGallery = typeof galleries.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;