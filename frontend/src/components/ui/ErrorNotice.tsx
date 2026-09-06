type ErrorNoticeProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorNotice({ message, onRetry, retryLabel = "Try again", className = "" }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={[
        "flex flex-wrap items-center gap-3 rounded-r-control border-l-[3px] border-danger bg-raised px-4 py-3 text-body",
        className,
      ].join(" ")}
    >
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control px-3 py-1 text-small text-violet hover:bg-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ErrorNotice;
