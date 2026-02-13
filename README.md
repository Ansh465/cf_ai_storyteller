# Cloudflare AI Storyteller

An infinite text adventure game powered by Cloudflare Workers, Workers AI (Llama 3.3), Durable Objects, and Workflows.

**Repository:** `cf_ai_storyteller`

## Features

- **AI Dungeon Master**: Uses `@cf/meta/llama-3.3-71b-instruct-awq` to generate dynamic story responses.
- **Persistent State**: Durable Objects maintain your inventory, health, XP, and chat history across sessions.
- **Background Events**: Cloudflare Workflows analyze your story history to generate "Chapter Summaries" and titles in the background.
- **Instant UI**: A fast, edge-served HTML/JS frontend contained within the Worker.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Cloudflare Account](https://dash.cloudflare.com/)
- Wrangler CLI (`npm install -g wrangler`)

## Setup & Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Start Development Server**:
   ```bash
   npx wrangler dev
   ```
   
4. **Play**:
   Open your browser to [http://localhost:8787](http://localhost:8787).

## Architecture

- **`src/index.ts`**: Main Hono application. Serves the static frontend and routes API requests to the Durable Object.
- **`src/gameDO.ts`**: The Durable Object (`StoryDO`). This is the heart of the game. It stores the state and orchestrates the AI calls.
- **`src/workflow.ts`**: The Workflow (`LevelUpWorkflow`). Triggered periodically (every 10 turns) to summarize the story so far using a separate AI call, demonstrating async processing.

## Deployment

To deploy to your Cloudflare account:

```bash
npx wrangler deploy
```

## Disclaimer

This is a demo application for the Cloudflare AI assignment.
