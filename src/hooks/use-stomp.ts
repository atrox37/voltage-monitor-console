import { useEffect, useState } from "react";
import stompManager, { type ConnectionStatus } from "@/lib/stomp";

/** 订阅 STOMP 连接状态 */
export function useStompStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(stompManager.status);

  useEffect(() => {
    return stompManager.subscribeStatus(setStatus);
  }, []);

  return status;
}

export { stompManager as stomp };
