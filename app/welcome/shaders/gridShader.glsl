precision highp float;

varying vec3 vPosition;
varying float vLineID;

uniform float u_gridSize;
uniform vec3 u_activeLineStarts[MAX_PULSES];
uniform vec3 u_activeLineEnds[MAX_PULSES];
uniform float u_pulsePositions[MAX_PULSES];
uniform float u_activeLineIDs[MAX_PULSES];
uniform int u_activePulseCount;

vec3 colorA = vec3(1.0, 0.0, 1.0);    // magenta
vec3 colorB = vec3(0.0, 0.7, 1.0);    // lighter blue
vec3 pulseColor = vec3(1.0, 1.0, 1.0); // white pulse

void main() {
    // Base grid color
    float dist = length(vPosition.xz) / u_gridSize;
    float t = pow(dist, 0.75);
    t = clamp(t, 0.0, 1.0);
    vec3 baseColor = mix(colorA, colorB, t);

    // Calculate combined pulse effect from all active pulses
    float totalPulse = 0.0;

    for(int i = 0; i < MAX_PULSES; i++) {
        if(i >= u_activePulseCount)
            break;

        if(vLineID == u_activeLineIDs[i] && u_pulsePositions[i] >= 0.0) {
            vec3 lineDir = normalize(u_activeLineEnds[i] - u_activeLineStarts[i]);
            vec3 posOnLine = vPosition - u_activeLineStarts[i];
            float distAlongLine = dot(posOnLine, lineDir);
            float totalLineLength = length(u_activeLineEnds[i] - u_activeLineStarts[i]);

            float pulseWidth = 5.0;
            float pulseDist = abs(distAlongLine - (u_pulsePositions[i] * totalLineLength));
            totalPulse = max(totalPulse, smoothstep(pulseWidth, 0.0, pulseDist));
        }
    }

    // Combine colors
    vec3 finalColor = mix(baseColor, pulseColor, totalPulse * 0.8);

    // Add slight fade out at the horizon
    float alpha = 1.0 - (dist * 0.5);
    alpha = clamp(alpha, 0.3, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
}
