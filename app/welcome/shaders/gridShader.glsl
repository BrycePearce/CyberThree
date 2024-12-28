precision highp float;

varying vec3 vPosition;
uniform float u_gridSize;
uniform float u_time;
uniform float u_gridSpeed;

// Define our cyberpunk color palette
vec3 colorA = vec3(1.0, 0.0, 1.0);    // magenta
vec3 colorB = vec3(0.0, 0.7, 1.0);    // cyan
vec3 colorC = vec3(0.8, 0.0, 0.8);    // purple
vec3 colorD = vec3(0.0, 1.0, 0.8);    // turquoise

void main() {
    float dist = length(vPosition.xz) / u_gridSize;

    // Keep the speed but normalize the output to 0-1 range
    float speedControlledTime = u_time * u_gridSpeed;
    float timeMod = sin(speedControlledTime * 10.0) * 0.5 + 0.5;        // Increased speed but kept range
    float colorShift = sin(dist * 3.0 + speedControlledTime * 5.0) * 0.5 + 0.5;  // Increased speed but kept range
    float wave = sin(dist * 5.0 - speedControlledTime * 15.0) * 0.5 + 0.5;   // Increased speed but kept range

    vec3 color1 = mix(colorA, colorB, timeMod);
    vec3 color2 = mix(colorC, colorD, colorShift);
    vec3 finalColor = mix(color1, color2, wave);

    // Kept pulse the same
    float pulse = 1.0 + sin(speedControlledTime * 0.1) * 0.2;
    finalColor *= pulse;

    float fadeDistance = dist * (0.5 + sin(speedControlledTime * 0.05) * 0.1);
    float alpha = 1.0 - fadeDistance;
    alpha = clamp(alpha, 0.3, 1.0);

    float intensity = 1.0 - (dist * 0.2);
    intensity = clamp(intensity, 0.7, 1.2);
    finalColor = finalColor * intensity + vec3(0.2);

    gl_FragColor = vec4(finalColor, alpha);
}