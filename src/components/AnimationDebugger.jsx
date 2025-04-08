import { useEffect, useState } from "react";
import { getCurrentAnimations } from "../utils/animationUtils";

export function AnimationDebugger({ kreatonRef }) {
  const [animations, setAnimations] = useState([]);

  useEffect(() => {
    if (!kreatonRef.current) return;

    const updateInterval = setInterval(() => {
      if (kreatonRef.current && kreatonRef.current.actions) {
        const playing = getCurrentAnimations(kreatonRef.current.actions);
        setAnimations(playing);
      }
    }, 100);

    return () => clearInterval(updateInterval);
  }, [kreatonRef.current]);

  if (!animations.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        left: 10,
        background: "rgba(0,0,0,0.7)",
        color: "white",
        padding: 10,
        fontFamily: "monospace",
        zIndex: 1000,
      }}
    >
      <h3>Playing Animations:</h3>
      {animations.map((anim) => (
        <div key={anim.name}>
          {anim.name}: {(anim.progress * 100).toFixed(0)}% (weight:{" "}
          {anim.weight.toFixed(2)})
        </div>
      ))}
    </div>
  );
}
