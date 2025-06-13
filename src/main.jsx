import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Create a global function that can be called from the script tag
window.initCreativeDirectors = function (containerId = "index-root-threed") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  ReactDOM.createRoot(container).render(
    // <React.StrictMode>
    <App />
    // </React.StrictMode>
  );
};

// Auto-initialize if the container exists
if (document.getElementById("index-root-threed")) {
  window.initCreativeDirectors();
}
