import { SceneCanvas } from "./components/SceneCanvas";
import useSmoothScroll from "./utils/useSmoothScroll";

export default function App() {
  const { wrapperRef, containerRef } = useSmoothScroll({
    easeSpeed: 0.07,
    scrollSpeed: 0.6,
  });
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
  // const containerHeight = sections.length * 100; // in vh units
  return (
    <div
      ref={wrapperRef}
      style={{
        height: "100vh",
        overflow: "hidden",
        width: "100vw",
        backgroundColor: "#f4e6d7",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
        }}
      >
        <SceneCanvas />
      </div>
      <div
        id="scroll-container"
        ref={containerRef}
        style={{
          height: `${containerHeight}vh`, // Uncomment and fix this line
          position: "relative", // Add this to ensure proper height calculation
        }}
      >
        {sections.map((section, index) => (
          <section
            key={index}
            style={{
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
