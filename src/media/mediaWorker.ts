
import { MP4PullDemuxer } from './mp4_pull_demuxer';
import '@/media/third_party/mp4boxjs/mp4box.all.min.js';
import { AudioRenderer } from '@/media/lib/audio_renderer';
import { VideoRenderer } from '@/media/lib/video_renderer';

console.info(`Worker started`);

let moduleLoadedResolver = null;
const modulesReady = new Promise(resolver => (moduleLoadedResolver = resolver));
let playing = false
let audioRenderer = null;
let videoRenderer = null;
let lastMediaTimeSecs = 0;
let lastMediaTimeCapturePoint = 0;

(async () => {
  audioRenderer = new AudioRenderer();
  videoRenderer = new VideoRenderer();
  moduleLoadedResolver();
  moduleLoadedResolver = null;
  console.info('Worker modules imported');
})();

function updateMediaTime(mediaTimeSecs, capturedAtHighResTimestamp) {
  lastMediaTimeSecs = mediaTimeSecs;
  // Translate into Worker's time origin
  lastMediaTimeCapturePoint =
    capturedAtHighResTimestamp - performance.timeOrigin;
}

// Estimate current media time using last given time + offset from now()
function getMediaTimeMicroSeconds() {
  const msecsSinceCapture = performance.now() - lastMediaTimeCapturePoint;
  return ((lastMediaTimeSecs * 1000) + msecsSinceCapture) * 1000;
}

self.addEventListener('message', async function(e) {
  await modulesReady;

  console.info(`Worker message: ${JSON.stringify(e.data)}`);

  switch (e.data.command) {
    case 'initialize':

      const audioDemuxer = new MP4PullDemuxer(e.data.audioFile);
      const audioReady = audioRenderer.initialize(audioDemuxer);

      const videoDemuxer = new MP4PullDemuxer(e.data.videoFile);
      const videoReady = videoRenderer.initialize(videoDemuxer, e.data.canvas);
      await Promise.all([audioReady, videoReady]);
      postMessage({
        command: 'initialize-done',
        sampleRate: audioRenderer.sampleRate,
        channelCount: audioRenderer.channelCount,
        sharedArrayBuffer: audioRenderer.ringbuffer.buf
      });
      break;
    case 'play':
      playing = true;

      updateMediaTime(e.data.mediaTimeSecs,
        e.data.mediaTimeCapturedAtHighResTimestamp);

      audioRenderer.play();

      self.requestAnimationFrame(function renderVideo() {
        if (!playing)
          return;
        videoRenderer.render(getMediaTimeMicroSeconds());
        self.requestAnimationFrame(renderVideo);
      });
      break;
    case 'pause':
      playing = false;
      audioRenderer.pause();
      break;
    case 'update-media-time':
      updateMediaTime(e.data.mediaTimeSecs,
        e.data.mediaTimeCapturedAtHighResTimestamp);
      break;
    default:
      console.error(`Worker bad message: ${e.data}`);
  }

});
