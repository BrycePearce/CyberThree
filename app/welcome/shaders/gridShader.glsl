precision highp float;

varying vec3 vPosition;
varying vec2 vUv;
uniform float u_gridSize;
uniform float u_time;
uniform float u_gridSpeed;
uniform vec2 u_pulsePosition;  // Changed to single position
uniform float u_pulseActive;
uniform float u_pulseIntensity;

// Cyberpunk color palette
vec3 colorA = vec3(1.0, 0.0, 1.0);    // magenta
vec3 colorB = vec3(0.0, 0.7, 1.0);    // cyan
vec3 colorC = vec3(0.8, 0.0, 0.8);    // purple
vec3 colorD = vec3(0.0, 1.0, 0.8);    // turquoise

float calculatePulseEffect(vec2 uv) {
    vec2 pulseVector = uv - u_pulsePosition;
    float dist = length(pulseVector);

    // Grid-aligned paths
    float horizontalLine = abs(fract(uv.y + 0.5) - 0.5);
    float verticalLine = abs(fract(uv.x + 0.5) - 0.5);
    float gridLines = min(horizontalLine, verticalLine);

    // Create a much narrower, more focused surge
    float pulseRadius = 1.5;
    float coreRadius = 0.05; // Even smaller core for sharper effect

    // Sharp directional surge
    vec2 absVector = abs(pulseVector);
    float directionalDist = min(absVector.x, absVector.y); // Makes it follow grid lines more
    float surge = smoothstep(0.05, 0.0, gridLines) *
        smoothstep(pulseRadius, coreRadius, directionalDist);

    // Electrical arcing effect
    float arcNoise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
    float arcs = step(0.98, arcNoise) * smoothstep(pulseRadius * 0.5, 0.0, dist);

    // Add rapid, sharp fluctuations
    float flicker = sin(u_time * 60.0) * 0.5 + 0.5;
    float surgeWave = abs(sin(dist * 15.0 - u_time * 20.0));

    // Combine for final effect
    float pulseStrength = (surge * 2.0 + arcs) * surgeWave * flicker;
    pulseStrength *= smoothstep(pulseRadius, 0.0, dist);

    return pulseStrength * u_pulseActive * u_pulseIntensity;
}

void main() {
    vec2 gridPosition = vUv;
    float dist = length(gridPosition) / u_gridSize;

    // Base grid color calculations
    float speedControlledTime = u_time * u_gridSpeed;
    float timeMod = sin(speedControlledTime * 5.0) * 0.5 + 0.5;
    float colorShift = sin(dist * 3.0 + speedControlledTime * 2.0) * 0.5 + 0.5;
    float wave = sin(dist * 5.0 - speedControlledTime * 8.0) * 0.5 + 0.5;

    vec3 color1 = mix(colorA, colorB, timeMod);
    vec3 color2 = mix(colorC, colorD, colorShift);
    vec3 baseColor = mix(color1, color2, wave);

    // Enhanced pulse effect
    float pulseEffect = calculatePulseEffect(gridPosition);
    vec3 pulseColor = vec3(1.0);  // Bright white core

    // Add slight color variation to pulse
    pulseColor = mix(pulseColor, colorB, pulseEffect * 0.3);

    // Blend pulse with base color
    vec3 finalColor = mix(baseColor, pulseColor, pulseEffect);

    // Apply distance-based effects
    float fadeDistance = dist * (0.5 + sin(speedControlledTime * 0.05) * 0.1);
    float alpha = 1.0 - fadeDistance;
    alpha = clamp(alpha, 0.3, 1.0);

    // Enhance intensity near pulse
    float intensity = 1.0 - (dist * 0.2);
    intensity = clamp(intensity + pulseEffect, 0.7, 1.8);
    finalColor = finalColor * intensity + vec3(0.2);

    // Boost alpha where pulse is active
    alpha = max(alpha, pulseEffect);

    gl_FragColor = vec4(finalColor, alpha);
}