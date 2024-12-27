varying vec2 vUv;
uniform float u_time;

void main() {
    // Enhanced colors with higher intensity
    vec3 neonBlue = vec3(0.2, 0.8, 1.0) * 1.8;    // bright cyan/blue
    // Define magenta with higher intensity and purer values
    vec3 neonMagenta = vec3(1.0, 0.0, 1.0) * 2.0; // pure magenta with higher intensity

    // Use only x position for color selection
    float x = vUv.x;
    vec3 baseColor;

    // Test with pure colors and sharp transitions
    if(x > 0.4 && x < 0.6) {
        baseColor = neonMagenta;
    } 
    // Left transition
    else if(x >= 0.3 && x <= 0.4) {
        float t = (x - 0.3) / 0.1;
        baseColor = mix(neonBlue, neonMagenta, t);
    }
    // Right transition
    else if(x >= 0.6 && x <= 0.7) {
        float t = (x - 0.6) / 0.1;
        baseColor = mix(neonMagenta, neonBlue, t);
    }
    // Edges (blue)
    else {
        baseColor = neonBlue;
    }

    // Create a sharper, more intense core line
    float coreWidth = 0.02;
    float coreLine = smoothstep(0.5 - coreWidth, 0.5, vUv.y) -
        smoothstep(0.5, 0.5 + coreWidth, vUv.y);

    // Create a wider glow effect
    float glowWidth = 0.3;
    float glow = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 3.0) * 0.8;

    // Animated pulse effect
    float mainPulse = sin(u_time * 1.5) * 0.15 + 0.85;
    float ripplePulse = sin(u_time * 3.0 + vUv.x * 6.28) * 0.1 + 0.9;

    // Combine core line and glow
    float brightness = coreLine * 2.0 + glow;
    brightness *= mainPulse * ripplePulse;

    // Add subtle horizontal energy lines
    float energyLines = pow(sin(vUv.x * 20.0 + u_time), 8.0) * 0.1 * glow;
    brightness += energyLines;

    // Final color combination
    vec3 finalColor = baseColor * brightness * 2.0;

    // Add white hot core
    float whiteness = coreLine * mainPulse;
    finalColor = mix(finalColor, vec3(1.5), whiteness * 0.7);

    // Smooth alpha falloff
    float alpha = brightness;
    alpha = smoothstep(0.0, 0.2, alpha) * 0.9;

    gl_FragColor = vec4(finalColor, alpha);
}