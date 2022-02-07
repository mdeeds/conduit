import { Knob, KnobTarget } from "./knob";


type TransferFunction = (x: number) => number;

class MultiParam {
  constructor(private params: AudioParam[]) { }
  public cancelScheduledValues(t: number) {
    for (const p of this.params) {
      p.cancelScheduledValues(t);
    }
  }
  public setValueAtTime(value: number, t: number) {
    for (const p of this.params) {
      p.setValueAtTime(value, t);
    }
  }
  public linearRampToValueAtTime(value: number, t: number) {
    for (const p of this.params) {
      p.linearRampToValueAtTime(value, t);
    }
  }
  public exponentialRampToValueAtTime(value: number, t: number) {
    for (const p of this.params) {
      p.exponentialRampToValueAtTime(value, t);
    }
  }
}

class ADSR {
  public attack = 0.05;
  public decay = 0.05;
  public sustain = 0.3;
  public release = 1;

  private static Identity: TransferFunction = function (x: number) { return x; };

  constructor(private audioCtx: AudioContext, private param: AudioParam | MultiParam,
    private transferFunction: TransferFunction = ADSR.Identity,
    private exponential = false) {
  }

  private linearTriggerAndRelease(durationS: number): number {
    let t = this.audioCtx.currentTime;
    this.param.cancelScheduledValues(t);
    t += this.attack;
    this.param.linearRampToValueAtTime(
      this.transferFunction(1.0), t);
    t += this.decay;
    const releaseTime = t;
    this.param.linearRampToValueAtTime(
      this.transferFunction(this.sustain), t);
    t += durationS;
    this.param.linearRampToValueAtTime(
      this.transferFunction(this.sustain), t);
    t += this.release;
    this.param.linearRampToValueAtTime(
      this.transferFunction(0), t);
    return releaseTime;
  }

  private exponentialTriggerAndRelease(durationS: number): number {
    let t = this.audioCtx.currentTime;
    this.param.cancelScheduledValues(t);
    this.param.setValueAtTime(t, this.transferFunction(0));
    t += this.attack;
    this.param.exponentialRampToValueAtTime(
      this.transferFunction(1.0), t);
    t += this.decay;
    const releaseTime = t;
    this.param.exponentialRampToValueAtTime(
      this.transferFunction(this.sustain), t);
    t += durationS;
    this.param.exponentialRampToValueAtTime(
      this.transferFunction(this.sustain), t);
    t += this.release;
    this.param.exponentialRampToValueAtTime(
      this.transferFunction(0), t);
    return releaseTime;
  }

  // Returns the begin sustain time.
  public triggerAndRelease(durationS: number): number {
    if (this.exponential) {
      return this.exponentialTriggerAndRelease(durationS);
    } else {
      return this.linearTriggerAndRelease(durationS);
    }
  }
}

export class Synth {
  private releaseDeadline = 0;
  private currentHz = 440;

  // Range is -5 to 5.  Envelope times depth = octaves.
  private filterDepth = 0.2;
  private pitchDepth = 0.0;

  // Range is 0 to 1.
  private highPass = 1.0;
  private lowPass = 1.0;

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
  private highPassEnv: ADSR;
  private lowPassEnv: ADSR;
  private pitchEnv: ADSR;
  private subEnv: ADSR;

  private lowPassTransfer: TransferFunction;
  private highPassTransfer: TransferFunction;
  private pitchTransfer: TransferFunction;
  private subTransfer: TransferFunction;

  private overdriveShaper: WaveShaperNode;
  private volumeGain: GainNode;

  private volumeKnob: Knob;
  constructor(private audioCtx: AudioContext) {
    this.setTransferFunctions();

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
    this.highPassEnv = new ADSR(
      audioCtx, this.highPassFilter.frequency, this.highPassTransfer, true);
    this.sawGain.connect(this.highPassFilter);
    this.squareGain.connect(this.highPassFilter);

    // Low Pass Filter
    this.lowPassFilter = audioCtx.createBiquadFilter();
    this.lowPassFilter.channelCount = 1;
    this.lowPassFilter.gain.setValueAtTime(1, audioCtx.currentTime);
    this.lowPassFilter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    this.lowPassFilter.type = 'lowpass';
    this.lowPassEnv = new ADSR(
      audioCtx, this.lowPassFilter.frequency, this.lowPassTransfer, true);
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

    // Env2
    const allFrequencies = new MultiParam(
      [this.squareOsc.frequency, this.sawOsc.frequency,
      this.lowPassFilter.frequency, this.highPassFilter.frequency,
      this.sineOsc.frequency]);
    this.pitchEnv = new ADSR(
      audioCtx, allFrequencies, this.pitchTransfer, true);
    this.subEnv = new ADSR(
      audioCtx, this.subOsc.frequency, this.subTransfer, true);

    // Overdrive
    this.overdriveShaper = audioCtx.createWaveShaper();
    this.overdriveShaper.channelCount = 1;
    //const curve = new Float32Array([-1, 1]);
    const curve = new Float32Array(101);
    this.setOverdriveShape(1.0, curve);
    this.overdriveShaper.curve = curve;
    this.sourceGain.connect(this.overdriveShaper);

    // Volume
    this.volumeGain = this.audioCtx.createGain();
    this.volumeGain.channelCount = 2;
    this.volumeGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    this.volumeKnob = new Knob(0, 1, 0.25);
    this.volumeKnob.addTarget(KnobTarget.fromAudioParam(
      this.volumeGain.gain, this.audioCtx, 0.05));
    this.overdriveShaper.connect(this.volumeGain);
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
    this.currentHz = hz;
  }

  public pluck() {
    if (this.audioCtx.currentTime > this.releaseDeadline) {
      this.releaseDeadline = this.env1.triggerAndRelease(0.5);
      this.subEnv.triggerAndRelease(0.5);
      this.pitchEnv.triggerAndRelease(0.5);
      this.highPassEnv.triggerAndRelease(0.5);
      this.lowPassEnv.triggerAndRelease(0.5);
    }
  }

  public getVolumeKnob(): Knob {
    return this.volumeKnob;
  }

  private setOverdriveShape(power: number, curve: Float32Array) {
    const bucketCount = curve.length - 1;
    for (let i = 0; i <= bucketCount; ++i) {
      const j = i - bucketCount / 2;
      const sign = (j < 0) ? -1 : 1;
      const x = Math.abs(j / (bucketCount / 2));
      curve[i] = sign * Math.pow(x, power);
    }
  }

  private setTransferFunctions() {
    this.lowPassTransfer = (x: number): number => {
      const octave = (x * 10 - 5) * this.filterDepth + this.lowPass;
      const f = Math.pow(2, octave) * this.currentHz;
      return f;
    };
    this.highPassTransfer = (x: number): number => {
      const octave = (x * 10 - 5) * this.filterDepth + this.highPass;
      const f = Math.pow(2, octave) * this.currentHz;
      return f;
    };
    this.pitchTransfer = (x: number): number => {
      const octave = (x * 10 - 5) * this.pitchDepth;
      const f = Math.pow(2, octave) * this.currentHz;
      return f;
    };
    this.subTransfer = (x: number): number => {
      const octave = (x * 10 - 5) * this.pitchDepth - 1;
      const f = Math.pow(2, octave) * this.currentHz;
      return f;
    };
  }
}