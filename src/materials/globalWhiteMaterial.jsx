import { MeshPhysicalMaterial, Color } from "three";
import { extend } from "@react-three/fiber";

// Register the material for JSX usage
extend({ MeshPhysicalMaterial });

// Create the white color (RGB: 238, 208, 145)
const WhiteColor = new Color("#ffffff");

// Material instance for direct usage
export const WhiteMaterial = new MeshPhysicalMaterial({
    name: "WhiteMaterial",
    color: WhiteColor,
    roughness: 1,
    metalness: 0,
    reflectivity: 0,
    // iridescence: 0.5,
    // emissive: kreatonGoldColor,
    // emissiveIntensity: 0.2,
    // ior: 1.5,
    // sheenRoughness: 1,
});