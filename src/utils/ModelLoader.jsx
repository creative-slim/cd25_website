import { useGLTF } from '@react-three/drei'
import { useState, useEffect } from 'react'

// Use a global Set to track which models have been logged for preloading.
const preloadedModels = new Set();

// Global error tracking to prevent infinite retry loops
const failedModels = new Set();
const retryCounts = new Map();

export function useModelLoader(localModelUrl, remoteModelUrl, options = {}) {
    const { maxRetries = 3, retryDelay = 2000, fallbackUrl = null } = options;
    const isDevelopment = import.meta.env.DEV;
    const [currentUrl, setCurrentUrl] = useState(isDevelopment ? localModelUrl : remoteModelUrl);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);

    const result = useGLTF(currentUrl);

    useEffect(() => {
        if (result.error) {
            setError(result.error);
            setIsLoading(false);

            // Track failed models
            failedModels.add(currentUrl);

            // Implement retry logic
            if (retryCount < maxRetries && !failedModels.has(currentUrl)) {
                const currentRetryCount = retryCounts.get(currentUrl) || 0;
                if (currentRetryCount < maxRetries) {
                    retryCounts.set(currentUrl, currentRetryCount + 1);

                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        setError(null);
                        setIsLoading(true);

                        // Try fallback URL if available
                        if (fallbackUrl && retryCount === 0) {
                            setCurrentUrl(fallbackUrl);
                        } else {
                            // Force reload by changing URL slightly
                            setCurrentUrl(prev => `${prev}?retry=${retryCount + 1}`);
                        }
                    }, retryDelay);
                }
            }
        } else if (result.scene) {
            setError(null);
            setIsLoading(false);
            // Reset retry count on success
            retryCounts.delete(currentUrl);
        }
    }, [result, currentUrl, retryCount, maxRetries, retryDelay, fallbackUrl]);

    return {
        ...result,
        error,
        isLoading,
        retryCount,
        retry: () => {
            setRetryCount(0);
            setError(null);
            setIsLoading(true);
            setCurrentUrl(isDevelopment ? localModelUrl : remoteModelUrl);
        }
    };
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