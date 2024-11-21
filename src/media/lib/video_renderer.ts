import { MP4Demuxer, VIDEO_STREAM_TYPE } from "../mp4_pull_demuxer";

const FRAME_BUFFER_TARGET_SIZE = 3;

export class ClipRenderer {
  private demuxer: MP4Demuxer;
  private frameBuffer: Array<any>;
  private fillInProgress: boolean;
  private decoder: VideoDecoder;
  private init_resolver: (() => Promise<void>) | null;

  constructor(demuxer: MP4Demuxer) {
    this.demuxer = demuxer;

    this.frameBuffer = [];
    this.fillInProgress = false;
  }

  // we asume demuxer is initialized when it comes here
  async initialize() {
    const config =
      (await this.demuxer.getDecoderConfigs()) as VideoDecoderConfig;

    this.decoder = new VideoDecoder({
      output: this.bufferFrame.bind(this),
      error: (e) => console.error(e),
    });

    const support = await VideoDecoder.isConfigSupported(config);
    console.assert(support.supported);
    this.decoder.configure(config);

    this.init_resolver = null;
    const promise = new Promise(
      (resolver) => (this.init_resolver = resolver as () => Promise<void>)
    );

    this.fillFrameBuffer();
    return promise;
  }

  render(timestamp: number) {
    const frame = this.chooseFrame(timestamp);
    this.fillFrameBuffer();

    if (frame == null) {
      console.warn("VideoRenderer.render(): no frame ");
      return;
    }

    return frame;
  }

  chooseFrame(timestamp: number) {
    if (this.frameBuffer.length == 0) return null;

    let minTimeDelta = Number.MAX_VALUE;
    let frameIndex = -1;

    for (let i = 0; i < this.frameBuffer.length; i++) {
      const time_delta = Math.abs(timestamp - this.frameBuffer[i].timestamp);
      if (time_delta < minTimeDelta) {
        minTimeDelta = time_delta;
        frameIndex = i;
      } else {
        break;
      }
    }

    console.assert(frameIndex != -1);

    for (let i = 0; i < frameIndex; i++) {
      const staleFrame = this.frameBuffer.shift();
      staleFrame.close();
    }

    const chosenFrame = this.frameBuffer[0];
    return chosenFrame;
  }

  async fillFrameBuffer() {
    if (this.frameBufferFull()) {
      if (this.init_resolver) {
        this.init_resolver();
        this.init_resolver = null;
      }

      return;
    }

    // This method can be called from multiple places and we some may already
    // be awaiting a demuxer read (only one read allowed at a time).
    if (this.fillInProgress) {
      return false;
    }
    this.fillInProgress = true;

    while (
      this.frameBuffer.length < FRAME_BUFFER_TARGET_SIZE &&
      this.decoder.decodeQueueSize < FRAME_BUFFER_TARGET_SIZE
    ) {
      const chunk = (await this.demuxer.getNextChunk(
        VIDEO_STREAM_TYPE
      )) as EncodedVideoChunk;
      if (!chunk) {
        throw new Error("NO VIDEO CHUNK");
      }
      this.decoder.decode(chunk);
    }

    this.fillInProgress = false;

    // Give decoder a chance to work, see if we saturated the pipeline.
    setTimeout(this.fillFrameBuffer.bind(this), 0);
  }

  frameBufferFull() {
    return this.frameBuffer.length >= FRAME_BUFFER_TARGET_SIZE;
  }

  bufferFrame(frame) {
    this.frameBuffer.push(frame);
  }
}
