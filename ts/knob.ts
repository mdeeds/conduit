
type ValueSetter = (x: number) => void;

export class KnobTarget {
  private constructor(private set: ValueSetter) {
  }

  public static fromAudioParam(param: AudioParam, audioCtx: AudioContext, lagS: number) {
    return new KnobTarget((x) => {
      param.linearRampToValueAtTime(x, audioCtx.currentTime + lagS);
    })
  }

  setValue(value: number) {
    this.set(value);
  }
}

export class Knob {
  private targets: KnobTarget[] = [];
  constructor(
    readonly low: number, readonly high: number, private value: number) {
    this.value = Math.max(low, Math.min(high, value));
  }

  change(relativeDelta: number) {
    const absoluteDelta = relativeDelta * (this.high - this.low);
    this.value += absoluteDelta;
    this.value = Math.max(this.low, Math.min(this.high, this.value));
    for (const t of this.targets) {
      t.setValue(this.value);
    }
  }

  addTarget(target: KnobTarget) {
    this.targets.push(target);
    target.setValue(this.value);
  }

  // getValue(): number {
  //   return this.value;
  // }
}