import { avatarColor, initialsOf } from "@/lib/format";

export function Avatar({
  name,
  size = 24,
  className = "",
  ring = false,
  title,
  shape = "circle",
}: {
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
  title?: string;
  /** The workspace account chip in the reference is a rounded square; people stay round. */
  shape?: "circle" | "square";
}) {
  return (
    <span
      title={title ?? name}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(name),
        fontSize: Math.max(9, Math.round(size * 0.4)),
      }}
      className={[
        "inline-flex shrink-0 items-center justify-center font-semibold tracking-wide text-white",
        shape === "square" ? "rounded-[8px]" : "rounded-full",
        ring ? "ring-2 ring-white" : "",
        className,
      ].join(" ")}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 4,
  size = 24,
}: {
  names: string[];
  max?: number;
  size?: number;
}) {
  const visible = names.slice(0, max);
  const hidden = names.length - visible.length;
  return (
    <span className="inline-flex items-center">
      <span className="inline-flex items-center -space-x-1.5">
        {visible.map((name) => (
          <Avatar key={name} name={name} size={size} ring />
        ))}
      </span>
      {hidden > 0 ? (
        <span
          className="ml-1.5 inline-flex items-center rounded-full bg-surface-muted px-1.5 py-[1px] text-[11px] font-medium text-muted"
          title={names.slice(max).join(", ")}
        >
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}
