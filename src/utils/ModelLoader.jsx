import { useGLTF } from '@react-three/drei'

// Use a global Set to track which models have been logged for preloading.
const preloadedModels = new Set();

export function useModelLoader(localModelUrl, remoteModelUrl) {
    const isDevelopment = import.meta.env.DEV;
    const modelUrl = isDevelopment ? localModelUrl : remoteModelUrl;
    const result = useGLTF(modelUrl);

    // The console.log has been moved to preloadModel to prevent it
    // from logging on every component re-render.

    return result;
}

// Preload function to be used in the main component
export function preloadModel(localModelUrl, remoteModelUrl) {
    const isDevelopment = import.meta.env.DEV;
    const modelUrl = isDevelopment ? localModelUrl : remoteModelUrl;

    // Only log the first time a model is preloaded.
    if (!preloadedModels.has(modelUrl)) {
        console.log(`Loading model from: ${modelUrl}`);
        preloadedModels.add(modelUrl);
    }

    // useGLTF.preload is idempotent, so it's safe to call multiple times.
    // It will only fetch the asset once.
    useGLTF.preload(modelUrl);
} 