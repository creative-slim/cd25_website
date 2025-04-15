import { SceneCanvas } from "./components/SceneCanvas";
import { useRef } from "react";

export default function App() {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const sections = [
    { borderColor: "#ff0000" },
    { borderColor: "#00ff00" },
    { borderColor: "#0000ff" },
    { borderColor: "#ffff00" },
    { borderColor: "#ff00ff" },
    { borderColor: "#29ff" },
    { borderColor: "#f1000f" },
    { borderColor: "#ffff00" },
  ];
  const containerHeight = sections.length * 100; // in vh units

  return <SceneCanvas scrollContainerRef={scrollContainerRef} />;
}
