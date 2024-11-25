import { RefObject, useEffect, useRef } from "react";
import MediaWorker from "./mediaWorker?worker";

export const useMediaWorker = ({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) => {
  const worker = useRef<Worker>(null!);

  useEffect(() => {
    if (worker.current) return;
    console.debug("Creating worker...");
    worker.current = new MediaWorker();
    worker.current.onmessage = console.debug;

    worker.current.onerror = (error) => {
      console.error("Worker error:", error);
    };

    worker.current.onmessageerror = (error) => {
      console.error("Worker message error:", error);
    };
    const canvas = canvasRef.current?.transferControlToOffscreen();
    if (canvas) {
      worker.current.postMessage(
        {
          command: "initialize",
          canvas,
        },
        [canvas]
      );
    }

    return () => {
      worker.current.terminate();
      worker.current = null!;
    };
  }, [canvasRef]);
};
