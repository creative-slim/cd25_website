import React from 'react';
import { Text } from '@react-three/drei';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error(`Error in component: ${this.props.name}`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            const componentName = this.props.name || "A component";
            return <group>
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[2, 0.5, 0.1]} />
                    <meshStandardMaterial color="red" transparent opacity={0.7} />
                </mesh>
                <Text
                    position={[0, 0, 0.1]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    Error in {componentName}
                </Text>
            </group>;
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 