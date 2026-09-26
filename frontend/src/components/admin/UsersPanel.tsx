import { useCallback, useEffect, useState } from "react";
import { type AccountStatus, type AdminUser, adminApi } from "../../api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ErrorNotice from "../ui/ErrorNotice";
import LoadingThread from "../ui/LoadingThread";

type Action = "approve" | "disable" | "enable";

const STATUS_LABEL: Record<AccountStatus, string> = { pending: "Waiting", approved: "Approved", disabled: "Disabled" };

const ACTIONS: Record<AccountStatus, { action: Action; label: string; variant: "primary" | "secondary" }[]> = {
  pending: [
    { action: "approve", label: "Approve", variant: "primary" },
    { action: "disable", label: "Disable", variant: "secondary" },
  ],
  approved: [{ action: "disable", label: "Disable", variant: "secondary" }],
  disabled: [{ action: "enable", label: "Enable", variant: "secondary" }],
};

const joinedFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setUsers((await adminApi.users()).users);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load accounts.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (user: AdminUser, action: Action) => {
    setBusyId(user.id);
    setActionError(null);
    try {
      const res = await adminApi[action](user.id);
      setUsers((current) => current?.map((u) => (u.id === user.id ? { ...u, status: res.status } : u)) ?? current);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the account.");
    } finally {
      setBusyId(null);
    }
  };

  if (loadError) return <ErrorNotice message={loadError} onRetry={() => void load()} />;
  if (!users) return <LoadingThread />;

  const waiting = users.filter((u) => u.status === "pending").length;
  const others = users.filter((u) => !u.is_admin).length;

  return (
    <Card>
      <h3 className="text-h3 text-ink">Accounts</h3>
      <p className="mt-0.5 text-small text-ink-2">
        {waiting === 0 ? "No one is waiting for approval." : `${waiting} waiting for approval`}
      </p>
      {actionError ? <ErrorNotice className="mt-4" message={actionError} /> : null}
      {others === 0 ? <p className="mt-4 text-body text-ink-2">No one else has signed up yet.</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead className="text-small text-ink-2">
            <tr>
              <th scope="col" className="py-2 pr-4 font-normal">Email</th>
              <th scope="col" className="py-2 pr-4 font-normal">Joined</th>
              <th scope="col" className="py-2 pr-4 font-normal">Status</th>
              <th scope="col" className="py-2 font-normal"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="py-3 pr-4 text-ink">{user.is_admin ? `${user.email} (you)` : user.email}</td>
                <td className="py-3 pr-4 text-ink-2">{joinedFormat.format(new Date(user.joined_at))}</td>
                <td className="py-3 pr-4 text-ink-2">{STATUS_LABEL[user.status]}</td>
                <td className="py-3">
                  {user.is_admin ? null : (
                    <div className="flex justify-end gap-2">
                      {ACTIONS[user.status].map(({ action, label, variant }) => (
                        <Button
                          key={action}
                          variant={variant}
                          aria-label={`${label} ${user.email}`}
                          disabled={busyId === user.id}
                          onClick={() => void act(user, action)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default UsersPanel;
