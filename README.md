# Dog Walk Planner

A private Streamlit app for planning dog walks.

## Features

- Optional Google OAuth authentication (see `REQUIRE_AUTH` in `app.py`)
- Persistent walk schedule and user configuration
- Dockerized for easy deployment
- Color-coded interactive UI

## Quick Start

1. Clone the repo.
2. Add your `.env` and `.streamlit/secrets.toml` (see example files, do not commit secrets).
3. **Authentication:**  
   By default, Google OAuth is required.  
   To disable authentication, set `REQUIRE_AUTH = False` at the top of `app.py`.
4. Build and run with Docker Compose:

   ```
   docker compose up -d --build
   ```

5. Access the app at `http://localhost:6969` (or your configured port).

## Deployment

- For production, use Docker Compose or Portainer.
- Data is persisted in the `data/` directory (mounted as a volume).

## Security

- **Never commit `.env` or `.streamlit/secrets.toml` to git.**
- Only allowed emails can access the app if authentication is enabled.
