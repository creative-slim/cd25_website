import { useRef, useImperativeHandle, forwardRef, createRef } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

const NUM_SPHERES = 50;
const SPHERE_RADIUS = 0.3;
const INITIAL_DIST = 3;

const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: "#6cf" });

export const ClumpSimple = forwardRef((props, ref) => {
    const sphereRefs = useRef(Array.from({ length: NUM_SPHERES }, () => createRef()));
    const initialPositions = useRef(
        Array.from({ length: NUM_SPHERES }, () => [
            (Math.random() - 0.5) * INITIAL_DIST * 2,
            Math.random() * 2 + 2,
            (Math.random() - 0.5) * INITIAL_DIST * 2,
        ])
    );

    // Expose cluster/explode methods
    useImperativeHandle(ref, () => ({
        setActive: (active) => {

        },
        cluster: () => {
            for (let i = 0; i < NUM_SPHERES; i++) {
                const body = sphereRefs.current[i].current;
                if (body) {
                    const pos = body.translation();
                    if (Array.isArray(pos)) {
                        const toCenter = new THREE.Vector3(-pos[0], -pos[1], -pos[2]);
                        toCenter.normalize().multiplyScalar(10);
                        body.applyImpulse([toCenter.x, toCenter.y, toCenter.z], true);
                    }
                }
            }
        },
        explode: () => {
            for (let i = 0; i < NUM_SPHERES; i++) {
                const body = sphereRefs.current[i].current;
                if (body) {
                    const pos = body.translation();
                    if (Array.isArray(pos)) {
                        const fromCenter = new THREE.Vector3(pos[0], pos[1], pos[2]);
                        fromCenter.normalize().multiplyScalar(15);
                        body.applyImpulse([fromCenter.x, fromCenter.y, fromCenter.z], true);
                    }
                }
            }
        },
        reset: () => {
            for (let i = 0; i < NUM_SPHERES; i++) {
                const body = sphereRefs.current[i].current;
                if (body) {
                    body.setTranslation(initialPositions.current[i], true);
                    body.setLinvel([0, 0, 0], true);
                    body.setAngvel([0, 0, 0], true);
                }
            }
        },
    }));

    return (
        <group {...props}>
            {Array.from({ length: NUM_SPHERES }).map((_, i) => (
                <RigidBody
                    key={i}
                    ref={sphereRefs.current[i]}
                    position={initialPositions.current[i]}
                    colliders="ball"
                    mass={1}
                    restitution={0.7}
                    friction={0.5}
                    linearDamping={0.1}
                    angularDamping={0.1}
                >
                    <mesh geometry={sphereGeometry} material={sphereMaterial} castShadow receiveShadow />
                </RigidBody>
            ))}
        </group>
    );
}); 