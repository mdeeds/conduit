import { Knob, KnobTarget } from "./knob";

class ADSR {
  public attack = 0.05;
  public decay = 0.05;
  public sustain = 0.3;
  public release = 1;
  constructor(private audioCtx: AudioContext, private param: AudioParam) {
  }

  // Returns the release time.
  public triggerAndRelease(durationS: number): number {
    let t = this.audioCtx.currentTime;
    this.param.cancelScheduledValues(t);
    t += this.attack;
    this.param.linearRampToValueAtTime(1.0, t);
    t += this.decay;
    const releaseTime = t;
    this.param.linearRampToValueAtTime(this.sustain, t);
    t += durationS;
    this.param.linearRampToValueAtTime(this.sustain, t);
    t += this.release;
    this.param.linearRampToValueAtTime(0, t);
    return releaseTime;
  }
}

export class Synth {
  private releaseDeadline = 0;
  private currentHz = 440;

  // Frequency -> Octave -> 
  //   sawOsc -> sawGain      
  //   squareOsc -> squareGain
  //                          
  // env2 -> 
  //   lowPassFilter
  //   highPassFilter
  //
  // sineOsc -> sineGain
  // subOsc -> subGain
  // 
  // env1 -> sourceGain
  // overdrive -> volume

  // Multiplier for the octave.  E.g. 16' = 1.0, 32' = 0.5
  private octave: number = 1.0;

  private sawOsc: OscillatorNode;
  private sawGain: GainNode;
  private squareOsc: OscillatorNode;
  private squareGain: GainNode;
  private sineOsc: OscillatorNode;
  private sineGain: GainNode;
  private subOsc: OscillatorNode;
  private subGain: GainNode;
  private sourceGain: GainNode;

  private lowPassFilter: BiquadFilterNode;
  private highPassFilter: BiquadFilterNode;


  private env1: ADSR;
  private env2: ADSR;

  private overdriveShaper: WaveShaperNode;
  private volumeGain: GainNode;

  private volumeKnob: Knob;
  constructor(private audioCtx: AudioContext) {

    // Saw Oscilator
    this.sawOsc = audioCtx.createOscillator();
    this.sawOsc.channelCount = 1;
    this.sawOsc.type = 'sawtooth';
    this.sawGain = audioCtx.createGain();
    this.sawGain.channelCount = 1;
    this.sawGain.gain.setValueAtTime(1, audioCtx.currentTime);
    this.sawOsc.connect(this.sawGain);
    this.sawOsc.start();

    // Square Oscilator
    this.squareOsc = audioCtx.createOscillator();
    this.squareOsc.channelCount = 1;
    this.squareOsc.type = 'sawtooth';
    this.squareGain = audioCtx.createGain();
    this.squareGain.channelCount = 1;
    this.squareGain.gain.setValueAtTime(1, audioCtx.currentTime);
    this.squareOsc.connect(this.squareGain);
    this.squareOsc.start();

    // High Pass filter
    this.highPassFilter = audioCtx.createBiquadFilter();
    this.highPassFilter.channelCount = 1;
    this.highPassFilter.gain.setValueAtTime(1, audioCtx.currentTime);
    this.highPassFilter.frequency.setValueAtTime(250, audioCtx.currentTime);
    this.highPassFilter.type = 'highpass';
    this.sawGain.connect(this.highPassFilter);
    this.squareGain.connect(this.highPassFilter);

    // Low Pass Filter
    this.lowPassFilter = audioCtx.createBiquadFilter();
    this.lowPassFilter.channelCount = 1;
    this.lowPassFilter.gain.setValueAtTime(1, audioCtx.currentTime);
    this.lowPassFilter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    this.lowPassFilter.type = 'lowpass';
    this.highPassFilter.connect(this.lowPassFilter);

    // Sine Oscilator
    this.sineOsc = audioCtx.createOscillator();
    this.sineOsc.channelCount = 1;
    this.sineOsc.type = 'sine';
    this.sineGain = audioCtx.createGain();
    this.sineGain.channelCount = 1;
    this.sineGain.gain.setValueAtTime(1, audioCtx.currentTime);
    this.sineOsc.connect(this.sineGain);
    this.sineOsc.start();

    // Sub Oscilator
    this.subOsc = audioCtx.createOscillator();
    this.subOsc.channelCount = 1;
    this.subOsc.type = 'sine';
    this.subGain = audioCtx.createGain();
    this.subOsc.channelCount = 1;
    this.subGain.gain.setValueAtTime(1, audioCtx.currentTime);
    this.subOsc.connect(this.subGain);
    this.subOsc.start();

    // Env1
    this.sourceGain = audioCtx.createGain();
    this.sourceGain.channelCount = 1;
    this.sourceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    this.env1 = new ADSR(this.audioCtx, this.sourceGain.gain);
    this.lowPassFilter.connect(this.sourceGain);
    this.sineGain.connect(this.sourceGain);
    this.subGain.connect(this.sourceGain);

    // Overdrive
    this.overdriveShaper = audioCtx.createWaveShaper();
    this.overdriveShaper.channelCount = 1;
    const curve = new Float32Array(1001);
    this.setOverdriveShape(1.0, curve);
    this.overdriveShaper.curve = curve;
    this.sourceGain.connect(this.overdriveShaper);

    // Volume
    this.volumeGain = this.audioCtx.createGain();
    this.volumeGain.channelCount = 2;
    this.volumeGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    this.volumeKnob = new Knob(0.05, 1, 1);
    this.volumeKnob.addTarget(KnobTarget.fromAudioParam(
      this.volumeGain.gain, this.audioCtx, 0.05));
    this.sourceGain.connect(this.volumeGain);
    this.volumeGain.connect(audioCtx.destination);

    this.setNote(64);
  }

  private twelfthRootOfTwo = Math.pow(2, 1 / 12);
  private midiNumberToHz(note: number): number {
    const aboveA = note - 69;
    return 440 * Math.pow(this.twelfthRootOfTwo, aboveA);
  }

  public setNote(note: number) {
    const hz = this.midiNumberToHz(note) * this.octave;
    const now = this.audioCtx.currentTime;
    this.sineOsc.frequency.setValueAtTime(hz, now);
    this.sawOsc.frequency.setValueAtTime(hz, now);
    this.squareOsc.frequency.setValueAtTime(hz, now);
    this.subOsc.frequency.setValueAtTime(hz / 2, now);
    this.currentHz = hz;
  }

  public pluck() {
    if (this.audioCtx.currentTime > this.releaseDeadline) {
      this.releaseDeadline = this.env1.triggerAndRelease(0.5);
    }
  }

  public getVolumeKnob(): Knob {
    return this.volumeKnob;
  }

  private setOverdriveShape(power: number, curve: Float32Array) {
    const bucketCount = curve.length - 1;
    for (let i = 0; i <= bucketCount; ++i) {
      const x = i / bucketCount;
      curve[i] = Math.pow(x, power);
    }
    console.log('Overdrive shaped.');
  }
}