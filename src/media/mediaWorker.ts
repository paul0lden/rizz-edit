import { MP4Demuxer } from "./mp4_pull_demuxer";
import { AudioRenderer } from "@/media/lib/audio_renderer";
import { VideoRenderer } from "@/media/lib/video_renderer";
import { EventBus } from "@/utils/thread";

let playing = false;
//const audioRenderer = new AudioRenderer();
const videoRenderer = new VideoRenderer();
let lastMediaTimeSecs = 0;
let lastMediaTimeCapturePoint = 0;

const bus = new EventBus('rizz-edit')
self.addEventListener('message', (e) => console.log(e.data))

function updateMediaTime(mediaTimeSecs, capturedAtHighResTimestamp) {
  lastMediaTimeSecs = mediaTimeSecs;
  // Translate into Worker's time origin
  lastMediaTimeCapturePoint =
    capturedAtHighResTimestamp - performance.timeOrigin;
}

// Estimate current media time using last given time + offset from now()
function getMediaTimeMicroSeconds() {
  const msecsSinceCapture = performance.now() - lastMediaTimeCapturePoint;
  return (lastMediaTimeSecs * 1000 + msecsSinceCapture) * 1000;
}

self.addEventListener("message", async function(e) {
  console.info(`Worker message: ${JSON.stringify(e.data)}`);

  switch (e.data.command) {
    case "initialize":

      console.log('post')
      break;
    case "play":
      playing = true;

      updateMediaTime(
        e.data.mediaTimeSecs,
        e.data.mediaTimeCapturedAtHighResTimestamp
      );

      audioRenderer.play();

      self.requestAnimationFrame(function renderVideo() {
        if (!playing) return;
        videoRenderer.render(getMediaTimeMicroSeconds());
        self.requestAnimationFrame(renderVideo);
      });
      break;
    case "pause":
      playing = false;
      audioRenderer.pause();
      break;
    case "update-media-time":
      updateMediaTime(
        e.data.mediaTimeSecs,
        e.data.mediaTimeCapturedAtHighResTimestamp
      );
      break;
    default:
      console.error(`Worker bad message: ${e.data}`);
  }
});

bus.on('fileAdded', () => {
  const demuxer = new MP4Demuxer(e.data.file);
  demuxer.initialize()
  const audioReady = audioRenderer.initialize(demuxer);
})
