import * as THREE from "three";

const pink = new THREE.Color("#A23EBF");
const purple = new THREE.Color("#653EBF");
const cyan = new THREE.Color("#3EA6BF");

export function getCyberpunkColor(fraction: number) {
    const PURPLE_BAND_START = 0.47;
    const PURPLE_BAND_END = 0.53;

    if (fraction < PURPLE_BAND_START) {
        const localFrac = fraction / PURPLE_BAND_START;
        return pink.clone().lerp(purple, localFrac);
    } else if (fraction < PURPLE_BAND_END) {
        return purple.clone();
    } else {
        const localFrac = (fraction - PURPLE_BAND_END) / (1 - PURPLE_BAND_END);
        return purple.clone().lerp(cyan, localFrac);
    }
}