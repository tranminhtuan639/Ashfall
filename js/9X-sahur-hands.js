  function createSahurWoodMaterial(direction = [0, 0, 1]) {
    const axis = new lt.Vector3(...direction).normalize();
    const across = new lt.Vector3(0, 1, 0).cross(axis).normalize();
    const depth = axis.clone().cross(across);
    const material = new lt.MeshStandardMaterial({
      color: 0xffffff,
      roughness: .49,
      metalness: 0,
    });
    material.customProgramCacheKey = () => "ashfall-sahur-wood-v1";
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        sahurGrainAxis: { value: axis },
        sahurGrainAcross: { value: across },
        sahurGrainDepth: { value: depth },
        sahurWoodDark: { value: new lt.Color(0x8d4b25) },
        sahurWoodLight: { value: new lt.Color(0xd99250) },
      });
      shader.vertexShader = "varying vec3 vSahurWoodPosition;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvSahurWoodPosition = position;",
      );
      shader.fragmentShader = `
        varying vec3 vSahurWoodPosition;
        uniform vec3 sahurGrainAxis, sahurGrainAcross, sahurGrainDepth;
        uniform vec3 sahurWoodDark, sahurWoodLight;
      ` + shader.fragmentShader.replace("#include <color_fragment>", `
        #include <color_fragment>
        float lengthwise = dot(vSahurWoodPosition, sahurGrainAxis);
        vec2 across = vec2(dot(vSahurWoodPosition, sahurGrainAcross),
                           dot(vSahurWoodPosition, sahurGrainDepth));
        float warp = sin(lengthwise * 22.0 + across.y * 70.0) * 0.0018;
        float ring = length(across + vec2(0.007 + warp, -0.004));
        float phase = ring * 630.0 + 0.48 * sin(ring * 370.0);
        float bands = 0.5 + 0.5 * sin(phase);
        float grain = mix(0.47, 0.76, bands) - 0.22 * pow(bands, 16.0);
        diffuseColor.rgb *= mix(sahurWoodDark, sahurWoodLight, grain);
      `);
    };
    return material;
  }
