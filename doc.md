# Creative Directors Website 2025 Documentation

## Project Overview
This is a modern web application built with React and Three.js, focusing on creating an immersive 3D experience. The project uses Vite as the build tool and incorporates various 3D libraries and tools for creating interactive web experiences.

## Tech Stack
- **Frontend Framework**: React 18.2.0
- **Build Tool**: Vite
- **3D Libraries**:
  - Three.js (v0.146.0)
  - React Three Fiber
  - React Three Drei
  - React Three Postprocessing
- **Animation**: GSAP
- **Development Tools**:
  - ESLint for code linting
  - TypeScript support
  - Leva for debugging

## Project Structure
```
cd25_website/
├── src/
│   ├── assets/         # Static assets
│   ├── components/     # React components
│   ├── docs/          # Documentation files
│   ├── materials/     # Three.js materials
│   ├── models/        # 3D models
│   ├── shaders/       # GLSL shaders
│   ├── utils/         # Utility functions
│   ├── App.jsx        # Main application component
│   └── main.jsx       # Application entry point
├── public/            # Public assets
├── dist/             # Build output
└── package.json      # Project dependencies and scripts
```

## Key Features
1. **3D Rendering**: Built with Three.js and React Three Fiber for high-performance 3D graphics
2. **Interactive Elements**: Uses React Three Drei for interactive 3D components
3. **Post-processing**: Implements advanced visual effects through React Three Postprocessing
4. **Animation**: Utilizes GSAP for smooth animations
5. **Physics**: Includes physics simulation capabilities through @react-three/cannon

## Getting Started

### Prerequisites
- Node.js (Latest LTS version recommended)
- pnpm (Package manager)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development
To start the development server:
```bash
pnpm dev
```

### Building for Production
To create a production build:
```bash
pnpm build
```

### Preview Production Build
To preview the production build locally:
```bash
pnpm preview
```

## Available Scripts
- `pnpm dev`: Start development server
- `pnpm build`: Create production build
- `pnpm preview`: Preview production build
- `pnpm lint`: Run ESLint for code linting

## Dependencies
### Main Dependencies
- React 18.2.0
- Three.js ecosystem
  - @react-three/fiber
  - @react-three/drei
  - @react-three/postprocessing
  - @react-three/cannon
- GSAP for animations
- Leva for debugging

### Development Dependencies
- Vite
- ESLint
- TypeScript types
- React development tools

## Project Organization
- **Components**: React components for UI elements
- **Models**: 3D models and assets
- **Materials**: Three.js material definitions
- **Shaders**: Custom GLSL shaders for advanced visual effects
- **Utils**: Helper functions and utilities
- **Assets**: Static assets like images and textures

## Best Practices
1. Use functional components with hooks
2. Follow ESLint rules for code consistency
3. Organize 3D assets in appropriate directories
4. Use TypeScript for better type safety
5. Implement proper error handling
6. Optimize 3D models and textures for web

## Contributing
1. Follow the existing code style
2. Write meaningful commit messages
3. Test changes thoroughly
4. Update documentation as needed

## License
Private project - All rights reserved 