import * as THREE from "three";

export interface TubeData {
    baseColor: THREE.Color;
    offset: number;
    emissiveBase: THREE.Color;
}

export type GridMesh = THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> & {
    userData: TubeData;
};

export interface GridLine {
    isVertical: boolean;
    mesh: GridMesh;
    coordinate: number;
    start: number;
    end: number;
    length: number;
    intersections: number[];
}