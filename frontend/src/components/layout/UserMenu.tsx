import { useId, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

type UserMenuProps = {
  placement: "right" | "below";
  className?: string;
};

export function UserMenu({ placement, className = "" }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const emailId = useId();
  const initial = (user?.email || "?").charAt(0).toUpperCase();

  const panelPlacement = placement === "right" ? "bottom-0 left-full ml-2" : "right-0 top-full mt-2";

  const onSignOut = () => {
    setOpen(false);
    logout();
  };

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={["flex h-8 w-8 items-center justify-center rounded-full bg-violet text-small text-white", focusRing].join(" ")}
      >
        {initial}
      </button>
      {open ? (
        <div className={["absolute w-56 rounded-panel border border-line bg-surface p-2", panelPlacement].join(" ")}>
          <p id={emailId} className="truncate px-2 py-1 text-small text-ink-2">
            {user?.email}
          </p>
          <div role="menu" aria-labelledby={emailId}>
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className={["mt-1 w-full rounded-control px-2 py-1.5 text-left text-small text-ink hover:bg-raised", focusRing].join(" ")}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UserMenu;
