# Dog Walk Planner Deployment: Lessons Learned & Best Practices

## 1. Directory Structure & File Placement

- **Project root:** `/opt/apps/dog-walk-planner`
- **Persistent data:** `data/`, `logs/`, `secrets/`, `config/`
- **Secrets and environment:**  
  - Place `secrets.toml` and `.env` in `/opt/apps/dog-walk-planner/`
  - Mount these files directly in `docker-compose.yml` for reliability

## 2. Docker Compose Configuration

- Use absolute paths for secrets and `.env` to avoid issues with Portainer's internal build context:
  ```yaml
  volumes:
    - /opt/apps/dog-walk-planner/secrets.toml:/app/.streamlit/secrets.toml:ro
    - /opt/apps/dog-walk-planner/.env:/app/.env:ro
  ```
- Attach your service to the same Docker network as Nginx Proxy Manager (NPM) for internal DNS resolution:
  ```yaml
  networks:
    - media_network

  networks:
    media_network:
      external: true
  ```
- When using internal Docker networking, you do **not** need to expose ports unless you want direct access.

## 3. Portainer & Git Integration

- Portainer clones your repo into an internal directory; relative paths in `docker-compose.yml` resolve from the repo root.
- **Secrets and `.env` should NOT be in the repo.**  
  Use bind mounts with absolute paths to provide them to the container.
- After updating secrets or `.env`, restart the stack in Portainer.

## 4. Nginx Proxy Manager (NPM) Setup

- Both NPM and your app must be on the same Docker network.
- In NPM, set the Forward Hostname/IP to your service name (e.g., `dogwalk`) and the correct port (e.g., `6969`).
- Restart both containers after network changes.
- For SSL, ensure your app is not redirecting HTTP to HTTPS internally.

## 5. Troubleshooting

- **Streamlit secrets error:**  
  - Ensure the secrets file is a file, not a directory.
  - Use absolute path bind mounts for secrets.
- **502 Bad Gateway:**  
  - Check Docker network membership for both containers.
  - Use service name and port in NPM.
  - Test connectivity from NPM container with `curl http://dogwalk:6969`.
- **Portainer stack context:**  
  - Do not rely on host-relative paths unless using absolute bind mounts.

## 6. Security

- Never commit `.env` or `secrets.toml` to git.
- Use `.gitignore` and `.dockerignore` to exclude sensitive files.
- Set file permissions on secrets (`chmod 600`).

## 7. General Best Practices

- Document all environment variables and secrets required for the app.
- Use a public repo for easier Portainer integration, unless you need privacy.
- Keep your Docker Compose file clean and minimal.
- Always restart containers after changing secrets or config.

---

**Summary:**  
Bind-mount secrets and `.env` using absolute paths, ensure Docker networking is correct, and use service names for internal routing.  
This approach is robust, secure, and works seamlessly with Portainer and Nginx Proxy Manager.

