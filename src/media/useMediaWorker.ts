import { useEffect, useRef } from "react";
import MediaWorker from "./mediaWorker?worker";

export const useMediaWorker = ({
  onWorkerReady,
}: {
  onWorkerReady: () => Parameters<Worker["postMessage"]> | null;
}) => {
  const worker = useRef<Worker>(null!);

  useEffect(() => {
    if (worker.current) return;
    console.debug("Creating worker...");
    worker.current = new MediaWorker();

    worker.current.onerror = (error) => {
      console.error("Worker error:", error);
    };

    worker.current.onmessageerror = (error) => {
      console.error("Worker message error:", error);
    };

    const args = onWorkerReady()

    if (args) {
      worker.current.postMessage(...args);
    }

    return () => {
      worker.current.terminate();
      worker.current = null!;
    };
  }, [onWorkerReady]);
};
