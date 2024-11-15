import SinkWorklet from './worklets/sink?worker&url'

const DEFAUL_SAMPLE_RATE = 48000;

const initContext = () => {
  const context = new AudioContext({
    sampleRate: DEFAUL_SAMPLE_RATE,
    latencyHint: "playback",
  });
  context.suspend();

  context.audioWorklet.addModule(SinkWorklet);
};
