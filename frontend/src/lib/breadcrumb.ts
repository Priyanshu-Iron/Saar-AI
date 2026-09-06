const TOP_LEVEL: Record<string, string> = {
  dashboard: "Dashboard",
  meetings: "Meetings",
  chat: "Chat",
  settings: "Settings",
};

/** Turns a pathname into the top bar breadcrumb text. */
export function breadcrumbFor(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const [root, id, sub] = parts;
  if (!root || !TOP_LEVEL[root]) return "SaarAI";
  const crumbs = [TOP_LEVEL[root]];
  if (root === "meetings" && id) {
    crumbs.push(`Meeting #${id}`);
    if (sub === "transcript") crumbs.push("Transcript");
  }
  return crumbs.join(" / ");
}
