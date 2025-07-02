import { SceneCanvas } from "./components/SceneCanvas";
import { ObserverScrollManager } from "./components/ObserverScrollManager";
import { useRef, useState } from "react";
import { OBSERVER_CONFIG } from "./config/observerConfig";

export default function App() {
  const scrollContainerRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    "section-0",
    "section-1",
    "section-2",
    "section-3",
    "section-4",
    "section-5",
    "section-6",
    "section-7"
  ];

  const handleSectionChange = (sectionIndex, direction, previousSection) => {
    setCurrentSection(sectionIndex);
    if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log(`%c[APP]%c Section changed to: ${sectionIndex} (${direction} from ${previousSection})`,
        'color: #42f584; font-weight: bold;',
        'color: inherit;'
      );
    }
  };

  return (
    <>
      <ObserverScrollManager
        sections={sections}
        onSectionChange={handleSectionChange}
        scrollContainerRef={scrollContainerRef}
      />
      <SceneCanvas
        scrollContainerRef={scrollContainerRef}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      />
    </>
  );
}
