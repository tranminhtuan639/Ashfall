  function createCoopStageRevive() {
    const delay = 36;
    let used = false;
    let remaining = null;
    return {
      reset() {
        used = false;
        remaining = null;
      },
      update(alive, teammateAlive, dt) {
        if (alive || !teammateAlive || used) {
          remaining = null;
          return false;
        }
        if (remaining === null) {
          remaining = delay;
          return false;
        }
        remaining = Math.max(0, remaining - dt);
        if (remaining > 1e-6) return false;
        used = true;
        remaining = null;
        return true;
      },
      seconds() { return remaining === null ? null : Math.ceil(remaining); },
    };
  }
