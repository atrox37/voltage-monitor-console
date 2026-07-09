/** 列表/详情中时间字段的统一文本样式（与邮箱等次要列一致，不用等宽小字号） */
export function DateTimeText({ value }: { value?: string | null }) {
  const text = value?.trim() ? value : "—";
  return <span className="text-text-secondary">{text}</span>;
}
