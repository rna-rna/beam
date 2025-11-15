# Overview

This is a collaborative gallery application built with React, Express, and PostgreSQL. The application enables users to create galleries, upload images, share them with others, and collaborate through comments, annotations, and real-time interactions. Key features include role-based permissions, real-time cursor tracking, drag-and-drop organization with folders, and comprehensive notification systems.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Framer Motion for animations and gesture handling

**UI Framework:**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom theme configuration
- Geist Sans and Geist Mono fonts for typography

**Key Design Patterns:**
- Component-based architecture with reusable UI primitives
- Custom hooks for shared logic (theming, authentication state)
- Optimistic updates for better perceived performance
- Real-time WebSocket integration for collaborative features

## Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- ESM module system for modern JavaScript features

**Authentication & Authorization:**
- Clerk for user authentication and management
- Role-based access control (Owner, Editor, Viewer, Commenter)
- JWT token-based API authentication
- Protected routes using middleware

**API Design:**
- RESTful endpoints organized by resource (galleries, images, comments, folders)
- Middleware for authentication and authorization checks
- Helper functions for permission validation (e.g., `getGalleryUserRole`, `canUpload`)

## Data Storage

**Database:**
- PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database queries and migrations
- Schema defined in TypeScript for compile-time validation

**Database Schema Highlights:**
- `galleries` - Core gallery entities with metadata and settings
- `images` - Individual images with metadata and positioning
- `comments` - Threaded comments with parent-child relationships via `parentId`
- `folders` - Organization structure for galleries
- `invites` - Pending gallery access invitations
- `cached_users` - User data cache to minimize external API calls
- `recently_viewed_galleries` - User-specific viewing history
- `notifications` - In-app notification system

**File Storage:**
- AWS S3 (R2) for image storage with signed URL uploads
- Cloudinary for OG image generation and transformations
- Direct browser-to-S3 uploads using presigned URLs to minimize server load

**Data Access Patterns:**
- Query caching with TanStack Query on the frontend
- Optimistic updates for immediate user feedback
- User data caching strategy to reduce Clerk API calls (15-minute staleness threshold)

## Real-Time Features

**WebSocket Implementation:**
- Socket.IO for bidirectional communication
- Room-based architecture (galleries as rooms)
- Events for cursor tracking, live collaboration, and notifications

**Real-Time Capabilities:**
- Multi-user cursor tracking within galleries
- Live comment updates and reactions
- Instant notification delivery
- Collaborative editing indicators

## External Dependencies

**Third-Party Services:**
- **Clerk** - Authentication, user management, and identity
- **Neon Database** - Serverless PostgreSQL hosting
- **AWS S3/R2** - Object storage for images
- **Cloudinary** - Image transformations and OG image overlays
- **SendGrid** - Transactional email delivery (for invitations)
- **Intercom** - Customer support and messaging
- **Mixpanel** - Product analytics and user tracking

**Key NPM Packages:**
- `@clerk/clerk-react` & `@clerk/backend` - Authentication
- `drizzle-orm` & `drizzle-kit` - Database ORM and migrations
- `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` - S3 operations
- `socket.io` & `socket.io-client` - Real-time communication
- `@tanstack/react-query` - Server state management
- `framer-motion` - Animation library
- `@dnd-kit/*` - Drag-and-drop functionality
- `@radix-ui/*` - Accessible UI primitives
- `react-hook-form` & `zod` - Form handling and validation
- `date-fns` - Date formatting utilities

**Development Tools:**
- `tsx` - TypeScript execution for development
- `esbuild` - Production bundling
- TypeScript with strict mode enabled
- ESLint for code quality

**Architectural Decisions:**

1. **Serverless Database Choice**: Neon PostgreSQL selected for automatic scaling and connection pooling, essential for handling variable loads in a collaborative application.

2. **Direct S3 Uploads**: Images upload directly from browser to S3 using presigned URLs, reducing server bandwidth and improving upload performance. The server only handles metadata and URL generation.

3. **Cached User Data**: To avoid rate limits and reduce latency, user profile data from Clerk is cached in PostgreSQL with a 15-minute staleness threshold. This significantly reduces external API calls while keeping data reasonably fresh.

4. **Role-Based Permissions**: Granular permission system (Owner, Editor, Viewer, Commenter) allows flexible collaboration models. Permissions are checked both client-side (for UI) and server-side (for security).

5. **Optimistic UI Updates**: Using TanStack Query's mutation callbacks, the UI updates immediately before server confirmation, then rolls back on errors. This creates a responsive feel for collaborative features.

6. **Socket.IO Rooms**: Each gallery is a separate Socket.IO room, ensuring real-time events only broadcast to relevant users, reducing unnecessary network traffic.

7. **Notification Grouping**: Similar notifications (e.g., multiple stars from same user) are grouped within a 10-minute window using a `groupId` pattern, reducing notification spam.

8. **Threaded Comments**: Comments use a self-referential `parentId` structure allowing unlimited nesting while maintaining simple database queries.