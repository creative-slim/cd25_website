import { MeshPhysicalMaterial, Color } from "three";
import { extend } from "@react-three/fiber";

// Register the material for JSX usage
extend({ MeshPhysicalMaterial });

// Create the gold color (RGB: 238, 208, 145)
const GoldColor = new Color("#fad078");

// Material instance for direct usage
export const GoldMaterial = new MeshPhysicalMaterial({
    name: "GoldMaterial",
    color: GoldColor,
    roughness: 0.3,
    metalness: 0.5,
    reflectivity: 0.5,
    // iridescence: 0.5,
    // emissive: kreatonGoldColor,
    // emissiveIntensity: 0.2,
    // ior: 1.5,
    // sheenRoughness: 1,
});