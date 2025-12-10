# Hackthon App

A modern React application built with Vite, featuring TailwindCSS, shadcn/ui components, and various libraries for routing, animations, and charts.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Modern React with hooks
- 🎨 **TailwindCSS** - Utility-first CSS framework
- 🧩 **shadcn/ui** - Beautiful component library
- 🛣️ **React Router** - Client-side routing
- 🎭 **Framer Motion** - Animation library
- 📊 **Chart.js** - Data visualization
- ✨ **TSParticles** - Particle effects

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ui/             # shadcn/ui components
├── pages/              # Page components
├── lib/                # Utility functions
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Pages

- **Landing Page** (`/`) - Hero section with features overview
- **Dashboard** (`/dashboard`) - Charts and data visualization
- **Detail Page** (`/detail`) - Detailed information and tables

## Technologies Used

- **Framework**: Vite + React (JavaScript)
- **Styling**: TailwindCSS + shadcn/ui
- **Routing**: react-router-dom
- **Animations**: framer-motion
- **Charts**: react-chartjs-2 + chart.js
- **Particles**: react-tsparticles
- **Icons**: Lucide React

## Development

The project is configured with:
- ESLint for code linting
- PostCSS for CSS processing
- TailwindCSS for styling
- Path aliases (`@/` for `src/`)

## Deployment

This project is configured for deployment on Netlify. Simply run `npm run build` and deploy the `dist` folder.
