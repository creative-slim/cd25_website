import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SHOOTING_STAR_COUNT = 6;
const SKY_RADIUS = 90;
const STAR_LENGTH = 3;
const STAR_COLOR = "#fffbe6";
const STAR_OPACITY = 0.7;
const MIN_SPEED = 30; // units per second
const MAX_SPEED = 60;
const MIN_INTERVAL = 2; // seconds
const MAX_INTERVAL = 7;

function randomVecOnSphere(radius) {
    const phi = Math.random() * Math.PI * 2;
    const costheta = Math.random() * 2 - 1;
    const theta = Math.acos(costheta);
    return new THREE.Vector3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );
}

function randomDirection() {
    // Random direction in the upper hemisphere
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * (Math.PI / 3) + Math.PI / 6; // 30-60 deg from zenith
    return new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
    ).normalize();
}

function createShootingStarState() {
    const start = randomVecOnSphere(SKY_RADIUS);
    const dir = randomDirection();
    const end = start.clone().add(dir.multiplyScalar(STAR_LENGTH));
    const speed = THREE.MathUtils.randFloat(MIN_SPEED, MAX_SPEED);
    const interval = THREE.MathUtils.randFloat(MIN_INTERVAL, MAX_INTERVAL);
    return {
        start,
        end,
        progress: Math.random(), // randomize initial progress
        speed,
        interval,
        timer: 0,
        active: false,
    };
}

export default function ShootingStars() {
    const stars = useRef(
        Array.from({ length: SHOOTING_STAR_COUNT }, createShootingStarState)
    );
    const meshRefs = useRef([]);

    useFrame((_, delta) => {
        stars.current.forEach((star, i) => {
            if (!star.active) {
                star.timer += delta;
                if (star.timer > star.interval) {
                    // Activate star
                    star.active = true;
                    star.progress = 0;
                    // New random trajectory
                    const newStart = randomVecOnSphere(SKY_RADIUS);
                    const newDir = randomDirection();
                    star.start.copy(newStart);
                    star.end.copy(newStart.clone().add(newDir.multiplyScalar(STAR_LENGTH)));
                    star.speed = THREE.MathUtils.randFloat(MIN_SPEED, MAX_SPEED);
                }
            } else {
                star.progress += (star.speed * delta) / SKY_RADIUS;
                if (star.progress > 1) {
                    // Reset
                    star.active = false;
                    star.timer = 0;
                    star.interval = THREE.MathUtils.randFloat(MIN_INTERVAL, MAX_INTERVAL);
                }
            }
            // Update mesh position
            if (meshRefs.current[i]) {
                if (star.active) {
                    meshRefs.current[i].visible = true;
                    meshRefs.current[i].position.lerpVectors(star.start, star.end, star.progress);
                } else {
                    meshRefs.current[i].visible = false;
                }
            }
        });
    });

    // Memoize geometry and material
    const geometry = useMemo(() => {
        const geo = new THREE.CylinderGeometry(0.03, 0.1, STAR_LENGTH, 6, 1, true);
        geo.translate(0, STAR_LENGTH / 2, 0);
        return geo;
    }, []);
    const material = useMemo(
        () => new THREE.MeshBasicMaterial({
            color: STAR_COLOR,
            transparent: true,
            opacity: STAR_OPACITY,
            depthWrite: false,
        }),
        []
    );

    return (
        <group>
            {stars.current.map((_, i) => (
                <mesh
                    key={i}
                    ref={el => (meshRefs.current[i] = el)}
                    geometry={geometry}
                    material={material}
                    visible={false}
                    rotation={[Math.PI / 2, 0, 0]}
                />
            ))}
        </group>
    );
} 