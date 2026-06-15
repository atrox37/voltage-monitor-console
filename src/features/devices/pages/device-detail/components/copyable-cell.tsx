import { useState } from "react";
import { CopyOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

export function CopyableCell({ text, maxWidth = 560 }: { text: string; maxWidth?: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Tooltip
      placement="topLeft"
      overlayStyle={{ maxWidth }}
      title={
        <div>
          <div className="mb-2 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">
            {text}
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30"
          >
            <CopyOutlined /> {copied ? "已复制" : "复制"}
          </button>
        </div>
      }
    >
      <span className="block truncate text-xs text-text-secondary">{text}</span>
    </Tooltip>
  );
}
