  const ashfallCharacters = Object.freeze({
    raven: Object.freeze({ name: "Raven", weapon: ashfallM416, sprintSpeed: 7.5 }),
    operator: Object.freeze({ name: "Triple-T", woodenHands: true, weapon: ashfallAK47Gold, sprintSpeed: 6.4 }),
  });

  function chooseAshfallCharacter(params, benchmark, boot) {
    if (benchmark || params.show || params.shot || params.autostart) {
      return Promise.resolve(null);
    }

    const panel = document.createElement("section");
    panel.setAttribute("aria-labelledby", "ashfall-character-heading");
    panel.style.cssText = "display:grid;gap:12px;width:min(480px,90vw);padding:20px;" +
      "background:var(--ink);border:1px solid var(--steel);color:var(--bone);text-align:left";
    const heading = document.createElement("h1");
    heading.id = "ashfall-character-heading";
    heading.textContent = "Chọn nhân vật";
    heading.style.margin = "0";
    panel.append(heading);

    return new Promise(resolve => {
      for (const character of Object.values(ashfallCharacters)) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = character.name + "  ·  " + character.weapon.name;
        button.style.cssText = "padding:14px;text-align:left;font:inherit;cursor:pointer;" +
          "border:1px solid var(--steel);background:#20252a;color:var(--bone)";
        button.addEventListener("click", () => {
          panel.remove();
          resolve(character);
        }, { once: true });
        panel.append(button);
      }
      boot.append(panel);
      panel.querySelector("button").focus();
    });
  }
