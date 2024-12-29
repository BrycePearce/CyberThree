precision highp float;

varying vec3 vPosition;
varying vec2 vUv;
uniform float u_gridSize;
uniform float u_time;
uniform float u_gridSpeed;
uniform vec2 u_pulsePosition;
uniform float u_pulseActive;
uniform float u_pulseIntensity;

vec3 tubeCore = vec3(1.0, 0.9, 0.9);
vec3 innerGlow = vec3(0.0, 1.0, 0.8);    // Cyan
vec3 outerGlow = vec3(0.0, 0.5, 0.4);    // Darker cyan

float getDistanceFalloff(float dist) {
    // Much more aggressive exponential falloff
    float falloffStart = 0.3;
    float falloffEnd = 0.6;

    // Normalized distance for falloff calculation
    float normalizedDist = smoothstep(falloffStart, falloffEnd, dist);

    // Exponential falloff (much steeper than quadratic)
    return exp(-normalizedDist * 5.0);
}

float createNeonLine(float distance, float distanceFromCamera) {
    // Get very aggressive falloff
    float intensity = getDistanceFalloff(distanceFromCamera);

    // Core line gets thinner but maintains some visibility
    float coreSize = mix(0.015, 0.005, distanceFromCamera);
    float core = smoothstep(coreSize, 0.0, distance);

    // Glow disappears much more quickly with distance
    float innerGlowSize = mix(0.08, 0.02, distanceFromCamera);
    float outerGlowSize = mix(0.15, 0.05, distanceFromCamera);

    float innerGlow = smoothstep(innerGlowSize, coreSize, distance) * intensity;
    float outerGlow = smoothstep(outerGlowSize, innerGlowSize, distance) * intensity * intensity;

    return core * intensity + (innerGlow * 0.5) + (outerGlow * 0.2);
}

float getNeonGridEffect(vec2 coord, float distanceFromCamera) {
    vec2 grid = abs(fract(coord - 0.5) - 0.5) * 2.0;
    float horizontalLine = createNeonLine(grid.y, distanceFromCamera);
    float verticalLine = createNeonLine(grid.x, distanceFromCamera);

    return max(horizontalLine, verticalLine);
}

float calculatePulseEffect(vec2 uv) {
    vec2 pulseVector = uv - u_pulsePosition;
    float dist = length(pulseVector);
    float pulse = smoothstep(2.0, 0.5, dist);
    float ring = sin(dist * 3.0 - u_time * 8.0) * 0.5 + 0.5;
    return pulse * ring * u_pulseActive * u_pulseIntensity;
}

void main() {
    vec2 gridPosition = vUv;
    float dist = length(gridPosition) / u_gridSize;

    // Get neon effect with very aggressive distance falloff
    float neonEffect = getNeonGridEffect(gridPosition, dist);

    // Layer the colors
    vec3 color = mix(outerGlow, innerGlow, neonEffect);
    color = mix(color, tubeCore, neonEffect * neonEffect);

    // Apply extremely aggressive distance-based intensity falloff
    float falloff = getDistanceFalloff(dist);
    color *= falloff;

    // Subtle time variation
    float timeVar = sin(u_time * u_gridSpeed) * 0.1 + 0.9;
    color *= timeVar;

    // Add pulse effect
    float pulseEffect = calculatePulseEffect(gridPosition);
    color = mix(color, vec3(1.0), pulseEffect * 0.4);

    // Calculate alpha with extreme falloff
    float alpha = falloff * neonEffect;
    alpha = clamp(alpha, 0.0, 0.9);

    gl_FragColor = vec4(color, alpha);
}