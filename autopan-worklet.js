class AutoPanProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "rate", defaultValue: 1, minValue: .01, maxValue: 50 },
      { name: "amount", defaultValue: 1, minValue: 0, maxValue: 1 },
      { name: "phase", defaultValue: 180, minValue: 0, maxValue: 360 },
      { name: "mix", defaultValue: 1, minValue: 0, maxValue: 1 }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.wave = "sine";
    this.bypass = false;

    this.port.onmessage = e => {
      if (e.data.type === "wave") this.wave = e.data.value;
      if (e.data.type === "bypass") this.bypass = e.data.value;
    };
  }

  shape(x) {
    if (this.wave === "square") return x < .5 ? 0 : 1;
    if (this.wave === "ramp") return x;
    if (this.wave === "triangle") return x < .5 ? x * 2 : 2 - x * 2;
    return (Math.sin(x * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input.length) return true;

    const leftIn = input[0];
    const rightIn = input[1] || leftIn;
    const leftOut = output[0];
    const rightOut = output[1] || output[0];

    for (let i = 0; i < leftOut.length; i++) {
      const rate = params.rate.length > 1 ? params.rate[i] : params.rate[0];
      const amount = params.amount.length > 1 ? params.amount[i] : params.amount[0];
      const phase = params.phase.length > 1 ? params.phase[i] : params.phase[0];
      const mix = params.mix.length > 1 ? params.mix[i] : params.mix[0];

      const lfoL = this.shape(this.phase);
      const lfoR = this.shape((this.phase + phase / 360) % 1);

      const gainL = 1 - amount * lfoL;
      const gainR = 1 - amount * lfoR;

      const dryL = leftIn[i] || 0;
      const dryR = rightIn[i] || 0;

      leftOut[i] = this.bypass
        ? dryL
        : dryL * (1 - mix) + dryL * gainL * mix;

      rightOut[i] = this.bypass
        ? dryR
        : dryR * (1 - mix) + dryR * gainR * mix;

      this.phase += rate / sampleRate;
      if (this.phase >= 1) this.phase -= 1;
    }

    return true;
  }
}

registerProcessor("autopan-processor", AutoPanProcessor);
