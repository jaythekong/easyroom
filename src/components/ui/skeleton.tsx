import { cn } from "@/lib/utils"
import { memo } from "react"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = memo(function Skeleton({
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
})

Skeleton.displayName = "Skeleton"

export { Skeleton }
