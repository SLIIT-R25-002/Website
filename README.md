# HeatScape

Seeing the heat, shaping the solution

## Overview

HeatScape is a single-page static website built with React 18 + Vite, featuring TailwindCSS for styling and Framer Motion for smooth animations. The project combines AI vision, mobile IoT sensing, and a lightweight digital twin to detect heat-driving surfaces and test mitigation strategies at street level.

## Tech Stack

- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Helmet Async** - Document head management

## Features

- ✨ Single-page application with smooth scroll navigation
- 🎨 Clean, academic design with high contrast
- 🚀 Lightweight animations (100-200ms)
- 📱 Fully responsive layout
- ♿ WCAG AA accessible
- 🎯 Lighthouse Performance ≥ 90 (desktop)
- 🎭 Respects `prefers-reduced-motion`

## Project Structure

```
Web/
├── public/
│   ├── data/
│   │   ├── milestones.json
│   │   ├── downloads.json
│   │   └── team.json
│   ├── docs/          # PDF documents
│   └── images/        # Image assets
├── src/
│   ├── components/
│   │   ├── BackToTop.jsx
│   │   ├── Card.jsx
│   │   ├── ContactForm.jsx
│   │   ├── DownloadsGrid.jsx
│   │   ├── Hero.jsx
│   │   ├── Methodology.jsx
│   │   ├── NavBar.jsx
│   │   ├── Overview.jsx
│   │   ├── Section.jsx
│   │   ├── TeamGrid.jsx
│   │   └── Timeline.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Page Sections

1. **Hero (#home)** - Title, tagline, and CTAs
2. **Overview (#overview)** - Three key feature cards
3. **Methodology (#methodology)** - Four-step process flow
4. **Milestones (#milestones)** - Project timeline
5. **Downloads (#downloads)** - Document repository
6. **Team (#team)** - Supervisors and team members
7. **Contact (#contact)** - Contact form and information

## Data Files

All content is loaded from local JSON files in `/public/data/`:

- `milestones.json` - Project timeline data
- `downloads.json` - Available documents
- `team.json` - Team members and supervisors

## Customization

### Update Content

Edit the JSON files in `/public/data/` to update:
- Project milestones
- Download links
- Team information

### Add Images

Place images in `/public/images/` and reference them in your components.

**Required Hero Background:**
- Save your sunset cityscape image as `/public/images/hero-bg.jpg`
- Recommended size: 1920x1080 or higher for best quality
- The image is currently referenced in the Hero component

### Add Documents

Place PDF files in `/public/docs/` and update `downloads.json` accordingly.

## Performance

The site is optimized for:
- Fast initial load
- Smooth animations (respects reduced motion preferences)
- Minimal bundle size
- No external API dependencies

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2025 HeatScape. All rights reserved.

## Contact

Sri Lanka Institute of Information Technology (SLIIT)  
Malabe, Sri Lanka  
Email: info.heatscape@gmail.com
