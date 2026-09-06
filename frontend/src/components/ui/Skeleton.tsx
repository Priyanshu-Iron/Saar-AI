type SkeletonProps = { className?: string };

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={["motion-safe:animate-pulse rounded-control bg-raised", className].join(" ")} />;
}

export default Skeleton;
