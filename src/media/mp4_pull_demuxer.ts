import { VideoMeta } from "@/types";
import MP4Box, {
  DataStream,
  MP4ArrayBuffer,
  MP4AudioTrack,
  MP4File,
  MP4Info,
  MP4Sample,
  MP4Track,
  MP4VideoTrack,
} from "mp4box";

const ENABLE_DEBUG_LOGGING = true;

function debugLog(msg) {
  if (!ENABLE_DEBUG_LOGGING) {
    return;
  }
  console.debug(msg);
}

interface EncodedVideoChunkInit {
  type: "key" | "delta";
  timestamp: number;
  duration?: number;
  data: Uint8Array;
}

interface EncodedAudioChunkInit {
  type: "key" | "delta";
  timestamp: number;
  duration?: number;
  data: Uint8Array;
}

declare class EncodedVideoChunk {
  constructor(init: EncodedVideoChunkInit);
}

declare class EncodedAudioChunk {
  constructor(init: EncodedAudioChunkInit);
}

type DecoderConfigs = {
  video?: VideoDecoderConfig;
  audio?: {
    codec: string;
    sampleRate: number;
    numberOfChannels: number;
    description: Uint8Array | null;
  };
};

export const VIDEO_STREAM_TYPE = "video";
export const AUDIO_STREAM_TYPE = "audio";

type StreamType = typeof VIDEO_STREAM_TYPE | typeof AUDIO_STREAM_TYPE;

export class MP4Demuxer {
  private file: Blob;
  private source: MP4Source;
  private readySamples: {
    video: Array<MP4Sample>;
    audio: Array<MP4Sample>;
  };
  private pending_read_resolvers: {
    video: ((sample: MP4Sample) => void) | null;
    audio: ((sample: MP4Sample) => void) | null;
  };
  private videoTrack: MP4VideoTrack | null;
  private audioTrack: MP4AudioTrack | null;

  constructor(file: Blob) {
    this.file = file;
    this.source = new MP4Source(file);
    this.readySamples = {
      video: [],
      audio: [],
    };
    this.pending_read_resolvers = {
      video: null,
      audio: null,
    };
    this.videoTrack = null;
    this.audioTrack = null;
  }

  async initialize(): Promise<void> {
    await this._tracksReady();

    if (this.videoTrack) {
      this._selectTrack(this.videoTrack);
    }
    if (this.audioTrack) {
      this._selectTrack(this.audioTrack);
    }
  }

  async getDecoderConfigs(): Promise<DecoderConfigs> {
    const configs: DecoderConfigs = {};

    if (this.videoTrack) {
      configs.video = {
        codec: this.videoTrack.codec.startsWith("vp08")
          ? "vp8"
          : this.videoTrack.codec,
        displayAspectWidth: this.videoTrack.track_width,
        displayAspectHeight: this.videoTrack.track_height,
        description: this._getDescription(
          this.source.getDescriptionBox(VIDEO_STREAM_TYPE)
        ),
      };
    }

    //if (this.audioTrack) {
    //  configs.audio = {
    //    codec: this.audioTrack.codec,
    //    sampleRate: this.audioTrack.audio.sample_rate,
    //    numberOfChannels: this.audioTrack.audio.channel_count,
    //    description: this.source.getAudioSpecificConfig(),
    //  };
    //}

    return configs;
  }

  async getNextChunk(
    type: StreamType
  ): Promise<EncodedVideoChunk | EncodedAudioChunk | null> {
    const sample = await this._readSample(type);
    if (!sample) return null;

    const pts_us = (sample.cts * 1000000) / sample.timescale;
    const duration_us = (sample.duration * 1000000) / sample.timescale;
    const ChunkType =
      type === AUDIO_STREAM_TYPE ? EncodedAudioChunk : EncodedVideoChunk;

    return new ChunkType({
      type: sample.is_sync ? "key" : "delta",
      timestamp: pts_us,
      duration: duration_us,
      data: sample.data,
    });
  }

  async getFileInfo() {
    return await this.source.getInfo();
  }

  async getVideoInfo(): Promise<VideoMeta> {
    await this._tracksReady(); // Wait for tracks to be initialized

    if (!this.videoTrack) {
      throw new Error("No video track found in the file");
    }

    return {
      width: this.videoTrack.track_width,
      height: this.videoTrack.track_height,
      duration:
        this.videoTrack.movie_duration,
      frameCount: this.videoTrack.nb_samples,
      // Calculate frame rate from samples and duration
      frameRate:
        (this.videoTrack.nb_samples * this.videoTrack.movie_timescale) /
        this.videoTrack.movie_duration,
      codec: this.videoTrack.codec,
      bitrate: this.videoTrack.bitrate,
    };
  }

  private _getDescription(descriptionBox: Box): Uint8Array {
    const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
    descriptionBox.write(stream);
    return new Uint8Array(stream.buffer, 8);
  }

  private async _tracksReady(): Promise<void> {
    const info = await this.source.getInfo();
    this.videoTrack = info.videoTracks[0] || null;
    this.audioTrack = info.audioTracks[0] || null;
  }

  private _selectTrack(track: MP4Track): void {
    this.source.selectTrack(track);
  }

  private async _readSample(type: StreamType): Promise<MP4Sample | null> {
    if (!type) throw new Error("Stream type is required");

    if (this.readySamples[type].length) {
      return Promise.resolve(this.readySamples[type].shift()!);
    }

    if (this.pending_read_resolvers[type]) {
      throw new Error("Pending read already exists");
    }

    const promise = new Promise<MP4Sample>((resolve) => {
      this.pending_read_resolvers[type] = resolve;
    });

    this.source.start(this._onSamples.bind(this));
    return promise;
  }

  private _onSamples(track_id: number, samples: MP4Sample[]): void {
    const type =
      this.videoTrack?.id === track_id ? "video" : ("audio" as StreamType);
    const SAMPLE_BUFFER_TARGET_SIZE = 50;

    this.readySamples[type].push(...samples);
    if (this.readySamples[type].length >= SAMPLE_BUFFER_TARGET_SIZE) {
      this.source.stop();
    }

    if (samples.length && this.pending_read_resolvers[type]) {
      this.pending_read_resolvers[type]!(this.readySamples[type].shift()!);
      this.pending_read_resolvers[type] = null;
    }
  }
}

class MP4Source {
  private file: MP4File;
  private info: MP4Info | null;
  private info_resolver: ((info: MP4Info) => void) | null;
  private _onSamples?: (track_id: number, samples: MP4Sample[]) => void;

  constructor(file: Blob) {
    this.file = MP4Box.createFile();
    this.file.onError = console.error.bind(console);
    this.file.onReady = this.onReady.bind(this);
    this.file.onSamples = this.onSamples.bind(this);

    debugLog("fetching file");
    const reader = file.stream().getReader();
    let offset = 0;
    const mp4File = this.file;

    function appendBuffers({
      done,
      value,
    }: ReadableStreamReadResult<Uint8Array>): Promise<void> | undefined {
      if (done) {
        mp4File.flush();
        return;
      }
      const buf = value.buffer as MP4ArrayBuffer;
      buf.fileStart = offset;

      offset += buf.byteLength;

      mp4File.appendBuffer(buf);

      return reader.read().then(appendBuffers);
    }

    reader.read().then(appendBuffers);

    this.info = null;
    this.info_resolver = null;
  }

  onReady(info: MP4Info): void {
    this.info = info;

    if (this.info_resolver) {
      this.info_resolver(info);
      this.info_resolver = null;
    }
  }

  getInfo(): Promise<MP4Info> {
    if (this.info) return Promise.resolve(this.info);

    return new Promise((resolve) => {
      this.info_resolver = resolve;
    });
  }

  getDescriptionBox(type: string): Box {
    const trackIndex = type === VIDEO_STREAM_TYPE ? 0 : 1;
    const entry =
      this.file.moov.traks[trackIndex].mdia.minf.stbl.stsd.entries[0];
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (!box) {
      throw new Error("avcC, hvcC, vpcC, or av1C box not found!");
    }
    return box;
  }

  getAudioSpecificConfig(): Uint8Array | null {
    const audioTrack = this.file.moov.traks.find(
      (trak) => trak.mdia.minf.stbl.stsd.entries[0].esds !== undefined
    );
    if (!audioTrack) return null;

    console.assert(
      this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd.descs[0]
        .tag == 0x04
    );
    console.assert(
      this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd.descs[0]
        .oti == 0x40
    );
    console.assert(
      this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].esds.esd.descs[0]
        .descs[0].tag == 0x05
    );

    const entry = audioTrack.mdia.minf.stbl.stsd.entries[0];
    return entry.esds.esd.descs[0].descs[0].data;
  }

  selectTrack(track: MP4Track): void {
    debugLog("selecting track %d", track.id);
    this.file.setExtractionOptions(track.id);
  }

  start(onSamples: (track_id: number, samples: MP4Sample[]) => void): void {
    this._onSamples = onSamples;
    this.file.start();
  }

  stop(): void {
    this.file.stop();
  }

  onSamples(track_id: number, ref: any, samples: MP4Sample[]): void {
    if (this._onSamples) {
      this._onSamples(track_id, samples);
    }
  }
}
