export function FRow({
  label,
  children,
  alignTop,
}: {
  label: string;
  children: React.ReactNode;
  alignTop?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[80px_1fr] gap-3 ${alignTop ? "items-start" : "items-center"}`}>
      <span className="pt-1 text-xs text-text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
