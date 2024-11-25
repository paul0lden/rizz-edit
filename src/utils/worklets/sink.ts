import { RingBuffer } from "../ringbuf";

registerProcessor(
  "AudioSink",
  class AudioSink extends AudioWorkletProcessor {
    private consumerSide: RingBuffer<Float32ArrayConstructor>;
    private mediaChannelCount: number;
    private deinterleaveBuffer: Float32Array;

    constructor(options) {
      super();
      const sab = options.processorOptions.sab;
      this.consumerSide = new RingBuffer(sab, Float32Array);
      this.mediaChannelCount = options.processorOptions.mediaChannelCount;
      // https://www.w3.org/TR/webaudio/#render-quantum-size
      const RENDER_QUANTUM_SIZE = 128;
      this.deinterleaveBuffer = new Float32Array(
        this.mediaChannelCount * RENDER_QUANTUM_SIZE
      );
    }

    // Deinterleave audio data from input (linear Float32Array) to output, an
    // array of Float32Array.
    deinterleave(input, output) {
      let inputIdx = 0;
      const outputChannelCount = output.length;
      for (let i = 0; i < output[0].length; i++) {
        for (let j = 0; j < outputChannelCount; j++) {
          output[j][i] = input[inputIdx++];
        }
      }
    }
    process(inputs, outputs, params) {
      if (
        this.consumerSide.pop(this.deinterleaveBuffer) !=
        this.deinterleaveBuffer.length
      ) {
        console.log("Warning: audio underrun");
      }
      this.deinterleave(this.deinterleaveBuffer, outputs[0]);
      return true;
    }
  }
);
