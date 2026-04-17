# TaskFlow

Modern drag-and-drop task management app with categories, priorities, progress tracking, and smooth animations

Built with [Builddy](https://builddy.app) — AI-powered app builder using GLM 5.1.

## Features

- Drag-and-drop task management with smooth animations for reordering within and across categories
- Full CRUD operations with task properties: title, description, priority levels (High/Medium/Low), due dates, and completion status
- Customizable categories with color coding and ability to add, rename, and delete categories
- Progress dashboard with visual completion rates per category and activity timeline
- Advanced search and filtering by task name, status, priority, and category
- Dark/light mode toggle with system preference detection and persistent selection
- Keyboard shortcuts for rapid task creation (Enter), completion (Space), and deletion (Delete)
- Confetti animation celebrating task completion

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Docker

```bash
docker compose up
```

### Deploy to Railway/Render

1. Push this directory to a GitHub repo
2. Connect to Railway or Render
3. It auto-detects the Dockerfile
4. Done!

## Tech Stack

- **Frontend**: HTML/CSS/JS + Tailwind CSS
- **Backend**: Express.js
- **Database**: SQLite
- **Deployment**: Docker