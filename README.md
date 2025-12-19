# Product Notebook

A comprehensive product management application for organizing strategy, roadmaps, hypotheses, and features in one place. Built with modern web technologies and designed for product managers and teams.

## Features

### Strategy Management
- Define and manage product strategy
- Organize product values and principles
- Track metrics with hierarchical structure
- Manage initiatives and their relationships

### Roadmap Planning
- Create goals organized by initiatives
- Plan across different time periods (current, next, half-year)
- Visualize roadmap with clear organization
- Archive and manage completed goals

### Hypothesis Tracking
- Track product hypotheses through their lifecycle
- Document problem and solution hypotheses
- Record validation steps and results
- Link hypotheses to impact metrics
- Manage hypothesis status (new, inProgress, accepted, rejected)

### Feature Board
- Kanban-style board for feature management
- Drag-and-drop interface for workflow management
- Multiple board columns: inbox, discovery, backlog, design, development, onHold, done, cancelled
- Link features to goals and initiatives
- Track feature positions and human-readable IDs

### Product Management
- Support for multiple products per user account
- Product-based data isolation
- Automatic product creation
- Product-specific settings and configurations

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL database, authentication, real-time subscriptions)
- **UI Components**: shadcn-ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Routing**: React Router DOM
- **Drag & Drop**: @dnd-kit
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended) - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm or bun
- Supabase project (for backend and authentication)

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd product-notebook
```

2. Install dependencies:
```sh
npm install
# or
bun install
```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Set up the database:
   - Run migrations from the `supabase/migrations` directory on your Supabase instance
   - Ensure Row Level Security (RLS) policies are enabled

5. Start the development server:
```sh
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run build:gh-pages` - Build for GitHub Pages deployment
- `npm run preview` - Preview production build
- `npm run preview:gh-pages` - Preview GitHub Pages build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
  ├── components/        # Reusable UI components
  │   ├── ui/           # shadcn-ui components
  │   └── ...           # Custom components
  ├── contexts/         # React contexts (Auth, Product)
  ├── hooks/            # Custom React hooks
  ├── integrations/     # External service integrations
  │   └── supabase/     # Supabase client and types
  ├── lib/              # Utility functions
  ├── pages/            # Page components
  │   ├── AuthPage.tsx
  │   ├── BoardPage.tsx
  │   ├── HypothesesPage.tsx
  │   ├── Index.tsx
  │   ├── NotFound.tsx
  │   ├── RoadmapPage.tsx
  │   └── StrategyPage.tsx
  └── main.tsx          # Application entry point

supabase/
  └── migrations/       # Database migration files

docs/                   # Project documentation
```

## Data Model

The application uses a **product-based data model** where:
- All data is scoped to a specific product
- Users can have multiple products
- Each product has its own features, goals, hypotheses, metrics, initiatives, and values
- Product context is managed globally via `ProductContext`

See `docs/data-model.md` for detailed information about the data structure.

## Authentication

The application uses Supabase Authentication for user management:
- Email/password authentication
- Protected routes require authentication
- User sessions are managed by Supabase
- All data is isolated per user and product

## Development

The project follows modern React best practices:
- TypeScript for type safety
- Component-based architecture
- Context API for global state (Auth, Product)
- React Query for server state management
- Custom hooks for reusable logic

## Documentation

Additional documentation is available in the `docs/` directory:
- `main-application.md` - Main application overview
- `data-model.md` - Database schema and data relationships
- `strategy-page.md` - Strategy page documentation
- `roadmap-page.md` - Roadmap page documentation
- `hypotheses-page.md` - Hypotheses page documentation
- `board-page.md` - Board page documentation
- `authentication.md` - Authentication flow
- `settings.md` - Settings configuration

## License

This project is private and proprietary.
