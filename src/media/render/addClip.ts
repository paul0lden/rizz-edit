import * as twgl from 'twgl.js'

const handleAddClip = (async (file: File) => {
  const gl = glRef.current;

  if (!gl) return;

  try {
    const texture = twgl.createTexture(gl, {
      src: [255, 255, 255, 255],
      width: 1,
      height: 1,
      min: gl.LINEAR,
      mag: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    });

    // playback

    twgl.setTextureFromElement(gl, texture, videoElement);

    const cameraPos = videoRendererRef.current?.getCameraPosition();
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const scale = 0.5 / Math.max(1, aspectRatio);

    const newClip: VideoClip = {
      id: Date.now(),
      file,
      fileName: file.name,
      duration: videoElement.duration,
      startTime: clipsRef.current.reduce(
        (total, clip) => Math.max(total, clip.startTime + clip.duration),
        0
      ),
      transform: {
        translation: [cameraPos[0], cameraPos[1], 0],
        rotation: [0, 0, 0],
        scale: [scale * aspectRatio, scale, 1],
      },
      effects: {
        brightness: 0,
        contrast: 1,
        saturation: 1,
      },
      texture,
    };

    videoRefs.current[newClip.id] = videoElement;

    setClipsList((prev) => {
      const updated = [...prev, newClip];
      clipsRef.current = updated;
      return updated;
    });

    needsRenderRef.current = true;
  } catch (error) {
    console.error("Error adding clip:", error);
  }
}, []);
