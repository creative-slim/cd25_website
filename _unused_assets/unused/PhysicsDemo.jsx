import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider, BallCollider } from "@react-three/rapier";
import * as THREE from "three";

export function PhysicsDemo() {
    const [boxes, setBoxes] = useState([]);
    const floorRef = useRef();
    const wallRef = useRef();

    // Function to add a new box
    const addBox = () => {
        const position = [
            (Math.random() - 0.5) * 4, // x
            5 + Math.random() * 2,     // y
            (Math.random() - 0.5) * 4  // z
        ];

        const rotation = [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        ];

        const size = 0.5 + Math.random() * 0.5;

        setBoxes(prev => [...prev, {
            id: Date.now(),
            position,
            rotation,
            size,
            color: new THREE.Color(Math.random(), Math.random(), Math.random())
        }]);
    };

    // Add a box every 2 seconds
    useFrame((state, delta) => {
        if (state.clock.elapsedTime % 2 < delta) {
            addBox();
        }
    });

    return (
        <group>
            {/* Floor */}
            <RigidBody type="fixed" ref={floorRef}>
                <CuboidCollider args={[10, 0.5, 10]} />
                <mesh position={[0, -0.5, 0]} receiveShadow>
                    <boxGeometry args={[20, 1, 20]} />
                    <meshStandardMaterial color="#303030" />
                </mesh>
            </RigidBody>

            {/* Walls */}
            <RigidBody type="fixed" ref={wallRef}>
                <CuboidCollider args={[0.5, 5, 10]} position={[-10, 4, 0]} />
                <CuboidCollider args={[0.5, 5, 10]} position={[10, 4, 0]} />
                <CuboidCollider args={[10, 5, 0.5]} position={[0, 4, -10]} />
                <CuboidCollider args={[10, 5, 0.5]} position={[0, 4, 10]} />

                <mesh position={[-10, 4, 0]} castShadow>
                    <boxGeometry args={[1, 10, 20]} />
                    <meshStandardMaterial color="#404040" />
                </mesh>
                <mesh position={[10, 4, 0]} castShadow>
                    <boxGeometry args={[1, 10, 20]} />
                    <meshStandardMaterial color="#404040" />
                </mesh>
                <mesh position={[0, 4, -10]} castShadow>
                    <boxGeometry args={[20, 10, 1]} />
                    <meshStandardMaterial color="#404040" />
                </mesh>
                <mesh position={[0, 4, 10]} castShadow>
                    <boxGeometry args={[20, 10, 1]} />
                    <meshStandardMaterial color="#404040" />
                </mesh>
            </RigidBody>

            {/* Dynamic boxes */}
            {boxes.map((box) => (
                <RigidBody
                    key={box.id}
                    position={box.position}
                    rotation={box.rotation}
                    colliders="cuboid"
                    mass={1}
                    restitution={0.5}
                    friction={0.7}
                    linearDamping={0.1}
                    angularDamping={0.1}
                >
                    <mesh castShadow>
                        <boxGeometry args={[box.size, box.size, box.size]} />
                        <meshStandardMaterial color={box.color} />
                    </mesh>
                </RigidBody>
            ))}

            {/* Add a sphere that follows the mouse */}
            <RigidBody
                type="dynamic"
                colliders="ball"
                mass={1}
                restitution={0.7}
                friction={0.5}
                linearDamping={0.1}
                angularDamping={0.1}
            >
                <mesh castShadow>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshStandardMaterial color="hotpink" />
                </mesh>
            </RigidBody>
        </group>
    );
} 