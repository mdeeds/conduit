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
    t += this.attack;
    this.param.linearRampToValueAtTime(1.0, t);
    t += this.decay;
    this.param.linearRampToValueAtTime(this.sustain, t);
    t += durationS;
    const releaseTime = t;
    this.param.linearRampToValueAtTime(this.sustain, t);
    t += this.release;
    this.param.linearRampToValueAtTime(0, t);
    return releaseTime;
  }
}

export class Synth {
  private sawOsc: OscillatorNode;
  private sawGain: GainNode;
  private env1: ADSR;
  private releaseDeadline = 0;
  private volumeGain: GainNode;
  private volumeKnob: Knob;
  constructor(private audioCtx: AudioContext) {
    this.sawOsc = audioCtx.createOscillator();
    this.sawOsc.type = 'sawtooth';
    this.sawGain = audioCtx.createGain();
    this.sawGain.gain.setValueAtTime(0, audioCtx.currentTime);
    this.sawOsc.connect(this.sawGain);
    this.sawOsc.start();

    this.env1 = new ADSR(this.audioCtx, this.sawGain.gain);
    this.volumeGain = this.audioCtx.createGain();
    this.volumeGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    this.volumeKnob = new Knob(0.05, 1, 1);
    this.volumeKnob.addTarget(KnobTarget.fromAudioParam(
      this.volumeGain.gain, this.audioCtx, 0.05));
    this.sawGain.connect(this.volumeGain);
    this.volumeGain.connect(audioCtx.destination);
  }

  public pluck() {
    if (this.audioCtx.currentTime > this.releaseDeadline) {
      this.releaseDeadline = this.env1.triggerAndRelease(0.5);
    }
  }

  public getVolumeKnob(): Knob {
    return this.volumeKnob;
  }
}