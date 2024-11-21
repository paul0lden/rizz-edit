import { MP4Demuxer } from "./mp4_pull_demuxer";
import { AudioRenderer } from "@/media/lib/audio_renderer";
import { ClipRenderer } from "@/media/lib/video_renderer";
import { EventBusManager } from "@/utils/thread";
import { VideoRenderer } from './render/VideoRenderer'
import { initGL } from "./render/glInit";
import { storeClips } from "@/store/clipsStore";
import { PlaybackManager } from "@/store/playback";

//const audioRenderer = new AudioRenderer();

const bus = EventBusManager.getInstance("rizz-edit");
self.addEventListener("message", (e) => console.log(e.data));

const { clips } = storeClips();

let videoRenderer;

self.addEventListener("message", async function(e) {
  console.info(`Worker message: ${JSON.stringify(e.data)}`);

  const command = e.data.command ?? ''

  if (command === "initialize") {
    const gl = initGL(e.data.canvas);
    videoRenderer = new VideoRenderer(gl, clips);
  }

  //case "play":
  //  playing = true;
  //
  //  updateMediaTime(
  //    e.data.mediaTimeSecs,
  //    e.data.mediaTimeCapturedAtHighResTimestamp
  //  );
  //
  //  audioRenderer.play();
  //
  //  self.requestAnimationFrame(function renderVideo() {
  //    if (!playing) return;
  //    videoRenderer.render(getMediaTimeMicroSeconds());
  //    self.requestAnimationFrame(renderVideo);
  //  });
  //  break;
  //case "pause":
  //  playing = false;
  //  audioRenderer.pause();
  //  break;
  //  case "update-media-time":
  //    updateMediaTime(
  //      e.data.mediaTimeSecs,
  //      e.data.mediaTimeCapturedAtHighResTimestamp
  //    );
  //    break;
  //  default:
  //    console.error(`Worker bad message: ${e.data}`);
  //}
});

bus.on("fileAdded", () => {
  const demuxer = new MP4Demuxer(e.data.file);
  demuxer.initialize();
  const audioReady = audioRenderer.initialize(demuxer);
});
