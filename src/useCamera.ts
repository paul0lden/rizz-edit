import { Camera } from "./Camera";
import { useRef } from "react"

export const useCamera = ({ width, height }) => {
  const cameraRef = useRef()

  const initCamera = () => {
    cameraRef.current = new Camera(width, height);
  }
}
