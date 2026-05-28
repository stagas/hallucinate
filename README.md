# Hallucinate – Massively Multiplayer Online Rave

A massively multiplayer 3D rave experience in your browser. Walk around a virtual nightclub with other players, customize your character's appearance, chat, and vibe to YouTube music.

## Requirements

| Requirement | Minimum | Notes |
|---|---|---|
| [Bun](https://bun.sh) | 1.2+ | JavaScript runtime (replaces Node.js) |
| Modern browser | Chrome 110+, Firefox 115+, Safari 16+ | WebGL 2.0 required |
| GPU | Any with WebGL 2 support | Hardware acceleration recommended |
| OS | Linux, macOS, Windows | Bun runs on all three |

## Installation

```bash
# Clone the repository
git clone https://github.com/stagas/hallucinate.git
cd hallucinate

# Install dependencies
bun install

# Build the frontend
bun run build
```

## Running

**Production mode** (serves built frontend + WebSocket server):

```bash
bun run start
```

The server listens on **port 3001** by default. Open `http://localhost:3001` in your browser.

**Development mode** (hot-reload for frontend and backend):

```bash
bun run dev
```

This launches two processes concurrently:
- **Vite** dev server (frontend, port 5173)
- **Bun** watch mode (backend + static files, port 3001)

**Custom port:**

```bash
PORT=8080 bun run start
```

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port (WebSocket + static files) |

## Architecture

- **Backend:** Single Bun server handles WebSocket connections for real-time multiplayer and serves static assets
- **Frontend:** Vite + TypeScript + TailwindCSS + Three.js for 3D rendering
- **Protocol:** Binary WebSocket protocol for efficient player state sync (position, rotation, style)
- **Rooms:** Two areas — an indoor club and an outdoor terrace, connected by a door

## License

MIT
