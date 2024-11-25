const renderFrame = (() => {
  const videoRenderer = videoRendererRef.current;
  //const selectionRenderer = selectionRendererRef.current;

  if (
    !gl ||
    !videoRenderer
    //|| !selectionRenderer
  )
    return;

  gl.clear(gl.COLOR_BUFFER_BIT);

  // Render all clips
  clipsRef.current.forEach((clip) => {
    if (!clip.texture) return;

    const video = videoRefs.current[clip.id];
    if (!video) return;

    if (isPlaying) {
      twgl.setTextureFromElement(gl, clip.texture, video);
    }

    const selectedClip = clipsRef.current.find(
      (clip) => clip.id === selectedClipId
    );
    videoRenderer.render(clip, selectedClip);
  });
});
