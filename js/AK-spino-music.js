  const spinoThemeAudio = /*@inline:data/spino-theme.json*/ null;

  const arenaMusicAudio = /*@inline:data/arena-music.json*/ null;

  function createArenaMusicTrack(context, destination, encoded, { loopStart, loopEnd, loopOnly = false, volume }) {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(destination);
    let buffers, source, wanted = false, paused = false;
    let looping = false, offset = 0, startedAt = 0;

    function load() {
      return buffers ||= context.decodeAudioData(assetBytes(encoded)).then(full => {
        const rate = full.sampleRate;
        const start = Math.round(loopStart * rate), end = Math.round(loopEnd * rate);
        const overlap = Math.round(.8 * rate);
        const loop = context.createBuffer(full.numberOfChannels, end - start, rate);
        for (let channel = 0; channel < full.numberOfChannels; channel++) {
          const input = full.getChannelData(channel);
          const output = loop.getChannelData(channel);
          output.set(input.subarray(start + overlap, end + overlap));
          for (let index = 0; index < overlap; index++) {
            const blend = .5 - .5 * Math.cos(Math.PI * index / (overlap - 1));
            const at = output.length - overlap + index;
            output[at] = output[at] * (1 - blend) + input[start + index] * blend;
          }
        }
        return { full, loop };
      }).catch(error => {
        console.warn("Could not load the arena music track", error);
        return null;
      });
    }

    function stopSource(fade = 0) {
      if (!source) return;
      const outgoing = source;
      source = null;
      outgoing.onended = () => outgoing.disconnect();
      outgoing.stop(context.currentTime + fade);
    }

    function resumeAudio() {
      return load().then(audio => {
        if (!audio || !wanted || paused || source) return;
        if (!looping && offset >= audio.full.duration) {
          offset = 0;
          looping = true;
        }
        const node = context.createBufferSource();
        node.buffer = looping ? audio.loop : audio.full;
        node.loop = looping;
        if (looping) offset %= node.buffer.duration;
        node.connect(gain);
        node.onended = () => {
          node.disconnect();
          if (source !== node) return;
          source = null;
          looping = true;
          offset = 0;
          resumeAudio();
        };
        source = node;
        startedAt = context.currentTime;
        node.start(0, offset);
      });
    }

    return {
      preload: load,
      get playing() { return !!source; },
      start() {
        if (wanted) return;
        looping = loopOnly;
        wanted = true;
        return resumeAudio();
      },
      stop() {
        wanted = false;
        offset = 0;
        looping = false;
        if (source) {
          gain.gain.setTargetAtTime(0, context.currentTime, .14);
          stopSource(.65);
        }
      },
      pause(value) {
        if (paused === value) return;
        paused = value;
        if (!wanted) return;
        if (!paused) return resumeAudio();
        if (source) offset += context.currentTime - startedAt;
        stopSource();
        gain.gain.value = 0;
      },
      mix(ducked, multiplier = 1) {
        if (!source) return;
        gain.gain.setTargetAtTime(volume * multiplier * (ducked ? .5 : 1), context.currentTime, .14);
      },
    };
  }


  function createArenaMusic(context, destination) {
    const tracks = {
      boss: createArenaMusicTrack(context, destination, spinoThemeAudio, {
        loopStart: 29.76, loopEnd: 81, volume: .65,
      }),
    };
    for (const [name, asset] of Object.entries(arenaMusicAudio)) {
      tracks[name] = createArenaMusicTrack(context, destination, asset.audio, {
        loopStart: 0, loopEnd: asset.length, loopOnly: true,
        volume: name === "ambient" ? .24 : .37,
      });
    }
    let current = null, paused = false, multiplier = 1;
    return {
      preload() { return Promise.all(Object.values(tracks).map(track => track.preload())); },
      get playing() { return current?.playing || false; },
      select(name, gain = 1) {
        multiplier = gain;
        const next = tracks[name] || null;
        if (next === current) return;
        current?.stop();
        current = next;
        current?.pause(paused);
        return current?.start();
      },
      pause(value) {
        paused = value;
        return current?.pause(value);
      },
      mix(ducked) { current?.mix(ducked, multiplier); },
    };
  }
