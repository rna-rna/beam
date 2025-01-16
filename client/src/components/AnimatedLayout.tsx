
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

interface AnimatedLayoutProps {
  children: ReactNode;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  actions?: ReactNode;
}

export function AnimatedLayout({ children }: AnimatedLayoutProps) {
  const [location] = useLocation();

  return (
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
  );
}
