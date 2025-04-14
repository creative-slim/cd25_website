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

  return (
    <div
      ref={containerRef}
      style={{
        height: "100vh",
        // overflow: "hidden",
        width: "100vw",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
        }}
      >
        <SceneCanvas scrollContainerRef={scrollContainerRef} />
      </div>
      <div
        id="scroll-container"
        ref={scrollContainerRef}
        style={{
          height: `${containerHeight}vh`,
          pointerEvents: "none",

          position: "relative",
          overflowY: "auto",
          width: "100%",
          scrollBehavior: "smooth", // Native smooth scrolling
        }}
      >
        {sections.map((section, index) => (
          <section
            id={`section-${index}`}
            key={index}
            style={{
              pointerEvents: "none",
              height: "100vh",
              width: "100vw",
              position: "relative",
              padding: "0",
              margin: "0",
              borderColor: section.borderColor,
              borderWidth: "3px",
              borderStyle: "solid",
              opacity: 0.5,
            }}
          ></section>
        ))}
      </div>
    </div>
  );
}
