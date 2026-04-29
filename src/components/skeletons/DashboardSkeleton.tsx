import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loading para Dashboard
 * Mantém placeholder enquanto dados carregam
 */
export const DashboardSkeleton = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-background pb-28 px-6 pt-6"
    >
      {/* Header Skeleton */}
      <motion.div variants={item} className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </motion.div>

      {/* Score Card Skeleton */}
      <motion.div variants={item} className="mb-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </motion.div>

      {/* Routine Skeleton */}
      <motion.div variants={item} className="mb-6">
        <Skeleton className="h-12 w-48 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </motion.div>

      {/* CTA Skeleton */}
      <motion.div variants={item}>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </motion.div>
    </motion.div>
  );
};

export default DashboardSkeleton;
