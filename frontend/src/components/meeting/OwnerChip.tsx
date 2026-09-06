type OwnerChipProps = { name: string | null };

export function OwnerChip({ name }: OwnerChipProps) {
  if (!name) return <span className="text-small text-ink-2">Unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-small">
      <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-violet text-[10px] font-semibold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
      {name}
    </span>
  );
}

export default OwnerChip;
