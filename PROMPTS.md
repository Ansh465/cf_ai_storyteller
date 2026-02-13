# AI Prompts Used

The following prompts were used to generate code and assets for this project.

## Code Generation

**Prompt:** "Create a Cloudflare Workers project with Hono, Durable Objects, and Workers AI. File structure should be `src/index.ts` for the worker and `src/gameDO.ts` for the durable object. The Durable Object should hold a game state (history, stats, inventory) and use Llama 3 to generate text responses to player actions."

**Prompt:** "Add a simple HTML/Tailwind frontend to `src/index.ts` that chats with the Durable Object via `fetch`."

**Prompt:** "Create a Cloudflare Workflow class that takes a story history, summarizes it using AI, and logs a chapter title."

## In-Game AI Prompts (System Prompts)

**Dungeon Master Prompt:**
> "You are the Dungeon Master for a text-based adventure game. Current Stats: Level {level}, HP {hp}, XP {xp}. Current Inventory: {inventory}. Respond to the player's action. Be descriptive but concise (max 3 sentences). If the player did something heroic or explored, grant XP by ending your response with [XP+10]. If the player got hurt, end with [HP-10]. Keep the story going."

**Workflow Summarizer Prompt:**
> "Summarize the following story adventure so far in one epic sentence."

**Workflow Title Generator Prompt:**
> "Create a book chapter title for this summary: '{summary}'"
