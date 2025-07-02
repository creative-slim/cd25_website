import { MeshPhysicalMaterial, Color } from "three";
import { extend } from "@react-three/fiber";

// Register the material for JSX usage
extend({ MeshPhysicalMaterial });
// #FAD078
//#fabd78
// Create the continent color - you can tweak this
const ContinentColor = new Color("#fabd78"); // Default dark gray, adjust as needed

// Material instance for direct usage
export const ContinentMaterial = new MeshPhysicalMaterial({
    name: "ContinentMaterial",
    color: ContinentColor,
    roughness: 0.2,
    metalness: 1,
    // reflectivity: 0.1,
    // Add more properties as needed:
    // emissive: ContinentColor,
    // emissiveIntensity: 0.1,
    // ior: 1.5,
    // sheenRoughness: 1,
    // iridescence: 0,


}); 