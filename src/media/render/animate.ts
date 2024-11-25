
useEffect(() => {
  const animate = (now: number) => {
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = now;
    }

    const deltaTime = (now - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = now;

    if (isPlaying) {
      currentTimeRef.current += deltaTime;

      const totalDuration = clipsRef.current.reduce(
        (max, clip) => Math.max(max, clip.startTime + clip.duration),
        0
      );

      if (currentTimeRef.current >= totalDuration) {
        currentTimeRef.current = 0;
      }

      clipsRef.current.forEach((clip) => {
        const video = videoRefs.current[clip.id];
        if (video) {
          const clipTime = currentTimeRef.current - clip.startTime;
          if (clipTime >= 0 && clipTime < clip.duration) {
            if (Math.abs(video.currentTime - clipTime) > 0.1) {
              video.currentTime = clipTime;
            }
          }
        }
      });
    }
    // Always render if anything needs updating
    if (needsRenderRef.current || isPlaying || selectedClipId !== null) {
      renderFrame();
      needsRenderRef.current = false;
    }

    rafRef.current = requestAnimationFrame(animate);
  };

  rafRef.current = requestAnimationFrame(animate);

  return () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };
}, []);
