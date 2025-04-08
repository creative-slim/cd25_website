import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { playAnimationTransition } from "../utils/animationUtils";
import { forwardRef } from "react";
import { useImperativeHandle, useRef, useMemo, useEffect } from "react";
import { NodeToyMaterial, NodeToyTick } from "@nodetoy/react-nodetoy";

export const Kreaton = forwardRef((props, ref) => {
  const internalRef = useRef();
  const { scene, animations } = useGLTF("src/models/Kreaton-transformed.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);

  useImperativeHandle(ref, () => internalRef.current);

  const { actions } = useAnimations(animations, internalRef);

  useEffect(() => {
    console.log("Available animations:", animations);
    console.log("Available actions:", actions);
    console.log("Action keys:", Object.keys(actions));

    console.log("nodes.Armsmesh_2 :", nodes.Armsmesh_2);

    if (actions.JUMP) {
      // Transition from "JUMP" to "WALKING" (if available)
      playAnimationTransition(actions.JUMP, actions.WALKING, {
        crossFadeTime: 0.5,
        fadeInDuration: 0.2,
      });
    } else {
      // Try to play another available animation
      const availableAction = Object.values(actions)[0];
      if (availableAction) {
        console.log("Playing alternative animation:", Object.keys(actions)[0]);
        availableAction.play();
      }
    }
  }, [actions, animations, playAnimationTransition]);

  return (
    <group ref={internalRef} {...props} dispose={null}>
      <group name="Scene">
        <group name="Kreaton_Rigged">
          <primitive object={nodes.mixamorigHips} />
        </group>
        <group name="Arms001">
          <skinnedMesh
            name="Armsmesh"
            geometry={nodes.Armsmesh.geometry}
            material={materials.white}
            skeleton={nodes.Armsmesh.skeleton}
          />
          <skinnedMesh
            name="Armsmesh_1"
            geometry={nodes.Armsmesh_1.geometry}
            material={materials.gold}
            skeleton={nodes.Armsmesh_1.skeleton}
          />
          <skinnedMesh
            name="Armsmesh_2"
            geometry={nodes.Armsmesh_2.geometry}
            // material={materials.Skin}
            skeleton={nodes.Armsmesh_2.skeleton}
          />
        </group>
        <group name="FeetLegs001">
          <skinnedMesh
            name="FeetLegsmesh"
            geometry={nodes.FeetLegsmesh.geometry}
            material={materials.white}
            skeleton={nodes.FeetLegsmesh.skeleton}
          />
          <skinnedMesh
            name="FeetLegsmesh_1"
            geometry={nodes.FeetLegsmesh_1.geometry}
            material={materials.gold}
            skeleton={nodes.FeetLegsmesh_1.skeleton}
          />
          <skinnedMesh
            name="FeetLegsmesh_2"
            geometry={nodes.FeetLegsmesh_2.geometry}
            material={materials.Skin}
            skeleton={nodes.FeetLegsmesh_2.skeleton}
          />
        </group>
        <group name="HelmetFace001">
          <skinnedMesh
            name="HelmetFacemesh"
            geometry={nodes.HelmetFacemesh.geometry}
            material={materials.white}
            skeleton={nodes.HelmetFacemesh.skeleton}
          />
          <skinnedMesh
            name="HelmetFacemesh_1"
            geometry={nodes.HelmetFacemesh_1.geometry}
            material={materials.gold}
            skeleton={nodes.HelmetFacemesh_1.skeleton}
          />
          <skinnedMesh
            name="HelmetFacemesh_2"
            geometry={nodes.HelmetFacemesh_2.geometry}
            material={materials.Skin}
            skeleton={nodes.HelmetFacemesh_2.skeleton}
          />
          <skinnedMesh
            name="HelmetFacemesh_3"
            geometry={nodes.HelmetFacemesh_3.geometry}
            material={materials.Red}
            skeleton={nodes.HelmetFacemesh_3.skeleton}
          />
        </group>
        <group name="Skirt001">
          <skinnedMesh
            name="Skirtmesh"
            geometry={nodes.Skirtmesh.geometry}
            material={materials.white}
            skeleton={nodes.Skirtmesh.skeleton}
          />
          <skinnedMesh
            name="Skirtmesh_1"
            geometry={nodes.Skirtmesh_1.geometry}
            material={materials.gold}
            skeleton={nodes.Skirtmesh_1.skeleton}
          />
        </group>
        <group name="TorsoArmor001">
          <skinnedMesh
            name="TorsoArmormesh"
            geometry={nodes.TorsoArmormesh.geometry}
            material={materials.white}
            skeleton={nodes.TorsoArmormesh.skeleton}
          />
          <skinnedMesh
            name="TorsoArmormesh_1"
            geometry={nodes.TorsoArmormesh_1.geometry}
            material={materials.gold}
            skeleton={nodes.TorsoArmormesh_1.skeleton}
          />
          <skinnedMesh
            name="TorsoArmormesh_2"
            geometry={nodes.TorsoArmormesh_2.geometry}
            material={materials.Skin}
            skeleton={nodes.TorsoArmormesh_2.skeleton}
          />
        </group>
      </group>
    </group>
  );
});

useGLTF.preload("src/models/Kreaton-transformed.glb");
