  const m416IceAudioData = /*@inline:data/m416-ice-audio.json*/ null;

  function m416IceAudioDefinitions() {
    const settings = {
      ice_shot: [.86, 5, 9],
      ice_dry: [.49, 2, 7],
      ice_magout: [.61, 1, 8],
      ice_magin: [.62, 1, 8],
      ice_bolt: [.59, 1, 8],
      ice_tail_in: [.48, 2, 7],
      ice_tail_out: [.48, 2, 7],
    };
    return Object.fromEntries(Object.entries(settings).map(([name, [peak, max, pri]]) => [
      name, { n: m416IceAudioData[name].length, sr: 24000, peak, max, pri, bus: "near", boot: true,
        gen: (rate, random, variant) => Float32Array.from(
          new Int16Array(assetBytes(m416IceAudioData[name][variant])), value => value / 32768) },
    ]));
  }
