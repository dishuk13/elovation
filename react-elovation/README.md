# React Elovation

A React port of the Elovation Ruby on Rails application, using Supabase as the backend database.

## Setup

1. Clone this repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file based on `.env.example` with your Supabase credentials:
```bash
cp .env.example .env
```
4. Edit the `.env` file and add your Supabase URL and anon key
5. Start the development server:
```bash
npm run dev
```

## Supabase Setup

You need to create the following tables in your Supabase database:

### Games Table
```sql
CREATE TABLE public.games (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  rating_type VARCHAR,
  min_number_of_teams INTEGER,
  max_number_of_teams INTEGER,
  min_number_of_players_per_team INTEGER,
  max_number_of_players_per_team INTEGER,
  allow_ties BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Players Table
```sql
CREATE TABLE public.players (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Ratings Table
```sql
CREATE TABLE public.ratings (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL,
  value INTEGER NOT NULL,
  pro BOOLEAN NOT NULL,
  trueskill_mean FLOAT,
  trueskill_deviation FLOAT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (game_id) REFERENCES public.games (id),
  FOREIGN KEY (player_id) REFERENCES public.players (id)
);
```

### Rating History Events Table
```sql
CREATE TABLE public.rating_history_events (
  id BIGSERIAL PRIMARY KEY,
  rating_id BIGINT NOT NULL,
  value INTEGER NOT NULL,
  trueskill_mean FLOAT,
  trueskill_deviation FLOAT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (rating_id) REFERENCES public.ratings (id)
);
```

### Results Table
```sql
CREATE TABLE public.results (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (game_id) REFERENCES public.games (id)
);
```

### Teams Table
```sql
CREATE TABLE public.teams (
  id BIGSERIAL PRIMARY KEY,
  rank INTEGER,
  result_id BIGINT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (result_id) REFERENCES public.results (id)
);
```

### Memberships Table
```sql
CREATE TABLE public.memberships (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (player_id) REFERENCES public.players (id),
  FOREIGN KEY (team_id) REFERENCES public.teams (id)
);
```

```sql
CREATE VIEW team_players AS
SELECT 
  teams.id AS team_id, 
  teams.rank, 
  teams.result_id, 
  teams.score, 
  players.id AS player_id, 
  players.name AS player_name, 
  players.email AS player_email
FROM teams
JOIN memberships ON teams.id = memberships.team_id
JOIN players ON memberships.player_id = players.id;
```

## Setting up Supabase Authentication with Google SSO

This application uses Supabase for authentication with Google SSO. Follow these steps to set it up:

1. Create a Supabase project at https://supabase.com if you haven't already.

2. In your Supabase project dashboard, go to "Authentication" → "Providers" and enable Google authentication.

3. Set up OAuth credentials in Google Cloud Platform:
   - Go to https://console.cloud.google.com/
   - Create a new project or use an existing one
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Set the application type to "Web application"
   - Add authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/callback` (for local development)
   - Save and note the Client ID and Client Secret

4. Back in Supabase, configure Google Auth provider:
   - Paste the Client ID and Client Secret from Google Cloud Console
   - Save the configuration

5. Create a `.env.local` file in the root of the react-elovation directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
   Replace the placeholder values with your actual Supabase URL and anon key from your Supabase project settings → API section.

6. Start the development server:
   ```
   npm run dev
   ```

7. The application should now have Google authentication enabled!

## Testing

Run tests with:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate test coverage report:
```bash
npm run test:coverage
```

## Project Structure

- `/src` - Source code
  - `/components` - Reusable UI components
  - `/pages` - Page components
  - `/lib` - Utility functions and services
  - `/context` - React context providers

## Features

- Player management
- Game management
- Rating tracking
- Result recording
- Statistics and visualizations 