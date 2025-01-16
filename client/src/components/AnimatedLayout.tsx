import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";

interface AnimatedLayoutProps {
  children: ReactNode;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  actions?: ReactNode;
}

export function AnimatedLayout({ children, title, onTitleChange, actions }: AnimatedLayoutProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}