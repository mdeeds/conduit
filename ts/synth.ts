class ADSR {
  public attack = 0;
  public decay = 0;
  public sustain = 1;
  public release = 0;
  constructor(private audioCtx: AudioContext, private param: AudioParam) {
  }

  public triggerAndRelease(durationS: number) {
    let t = this.audioCtx.currentTime;
    t += this.attack;
    this.param.linearRampToValueAtTime(1.0, t);
    t += this.decay;
    this.param.linearRampToValueAtTime(this.sustain, t);
    t += durationS;
    this.param.linearRampToValueAtTime(this.sustain, t);
    t += this.release;
    this.param.linearRampToValueAtTime(0, t);
  }
}

export class Synth {
  private sawOsc: OscillatorNode;
  private sawGain: GainNode;
  private env1: ADSR;
  constructor(private audioCtx: AudioContext) {
    this.sawOsc = audioCtx.createOscillator();
    this.sawOsc.type = 'sawtooth';
    this.sawGain = audioCtx.createGain();
    this.sawGain.gain.setValueAtTime(0, audioCtx.currentTime);
    this.sawOsc.connect(this.sawGain);
    this.sawGain.connect(this.audioCtx.destination);
    this.sawOsc.start();

    this.env1 = new ADSR(this.audioCtx, this.sawGain.gain);
  }

  public trigger() {
    this.env1.triggerAndRelease(0.5);
  }
}