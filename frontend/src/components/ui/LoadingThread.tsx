type LoadingThreadProps = {
  label?: string;
  className?: string;
};

export function LoadingThread({ label = "Loading", className = "" }: LoadingThreadProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={["flex min-h-[40vh] items-center justify-center", className].join(" ")}
    >
      <div className="relative h-0.5 w-12 rounded-full bg-thread">
        <span
          aria-hidden="true"
          className="thread-sweep absolute -top-1 h-2.5 w-2.5 rounded-full border-2 border-gold bg-gold"
          style={{ left: 0 }}
        />
      </div>
    </div>
  );
}

export default LoadingThread;
