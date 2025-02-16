import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getR2Image } from "@/lib/r2";
import { io } from 'socket.io-client';
import { default as GalleryActions } from '@/components/GalleryActions';

// Initialize Socket.IO client
const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Grid,
  LayoutGrid,
  MessageSquare,
  Star,
  CheckCircle,
  Loader2,
  Share,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PencilRuler,
  Eye,
  EyeOff,
  Lock,
  SquareScissors,
} from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import LightboxDialogContent from "@/components/dialog/LightboxDialogContent";
import { StarredUsersFilter } from "@/components/StarredUsersFilter";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Components
import { CommentBubble } from "@/components/CommentBubble";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useDropzone } from "react-dropzone";
import { MobileGalleryView } from "@/components/MobileGalleryView";
import type {
  Image,
  Gallery as GalleryType,
  Comment,
  Annotation,
  ImageOrPending,
  PendingImage,
} from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ShareModal } from "@/components/ShareModal";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { Toggle } from "@/components/ui/toggle";
import { useAuth } from "@clerk/clerk-react";
import { CommentModal } from "@/components/CommentModal";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/LoginModal";
import { useUpload, UploadProvider } from "@/context/UploadContext";
import { StarredAvatars } from "@/components/StarredAvatars";
import { Logo } from "@/components/Logo";
import { UserAvatar } from "@/components/UserAvatar";
import { SignUpModal } from "@/components/SignUpModal";
import PusherClient from "pusher-js";
import { nanoid } from "nanoid";
import { CursorOverlay } from "@/components/CursorOverlay";

// Initialize Pusher client
const pusherClient = new PusherClient(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  appId: import.meta.env.VITE_PUSHER_APP_ID,
  authEndpoint: "/pusher/auth",
  forceTLS: true,
  encrypted: true,
  withCredentials: true,
  enabledTransports: ["ws", "wss", "xhr_streaming", "xhr_polling"],
  disabledTransports: [],
});

// Validate required environment variables
if (
  !import.meta.env.VITE_PUSHER_KEY ||
  !import.meta.env.VITE_PUSHER_CLUSTER ||
  !import.meta.env.VITE_PUSHER_APP_ID
) {
  console.error("Missing required Pusher environment variables");
}

interface GalleryProps {
  slug?: string;
  title: string;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

import { Helmet } from "react-helmet";

import { FC } from 'react';
import GalleryContainer from './gallery/GalleryContainer';

const OldGallery: FC<any> = (props) => {
  return <GalleryContainer {...props} />;
};

export default OldGallery;