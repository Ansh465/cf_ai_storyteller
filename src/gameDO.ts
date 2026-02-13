import { Utils } from './utils'
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers'

interface Env {
    AI: any
    STORY_WORKFLOW: WorkflowEntrypoint
}

interface GameState {
    history: { role: string; content: string }[]
    stats: { level: number; hp: number; xp: number }
    inventory: string[]
}

export class StoryDO {
    state: DurableObjectState
    env: Env
    gameState: GameState

    constructor(state: DurableObjectState, env: Env) {
        this.state = state
        this.env = env
        this.gameState = {
            history: [],
            stats: { level: 1, hp: 100, xp: 0 },
            inventory: ['rusted sword', 'water skin']
        }
    }

    async fetch(request: Request) {
        // Load state from storage
        const stored = await this.state.storage.get<GameState>('gameState')
        if (stored) this.gameState = stored

        const url = new URL(request.url)

        if (url.pathname === '/api/state') {
            return Response.json({ ...this.gameState })
        }

        if (url.pathname === '/api/chat' && request.method === 'POST') {
            const body = await request.json() as { message: string }
            const userMessage = body.message

            // Add user message
            if (userMessage !== "Start Game") {
                this.gameState.history.push({ role: 'user', content: userMessage })
            }

            // Prepare context for AI
            const systemPrompt = `You are the Dungeon Master for a text-based adventure game.
      Current Stats: Level ${this.gameState.stats.level}, HP ${this.gameState.stats.hp}, XP ${this.gameState.stats.xp}.
      Current Inventory: ${this.gameState.inventory.join(', ')}.
      
      Respond to the player's action. Be descriptive but concise (max 3 sentences).
      If the player did something heroic or explored, grant XP by ending your response with [XP+10].
      If the player got hurt, end with [HP-10].
      Keep the story going.
      `

            const messages = [
                { role: 'system', content: systemPrompt },
                ...this.gameState.history.slice(-10) // Keep context window manageable
            ]

            try {
                const response: any = await this.env.AI.run('@cf/meta/llama-3.3-71b-instruct-awq', {
                    messages,
                    stream: false // simple for now
                })

                let aiText = response.response

                // Simple parsing for mechanics (AI-driven logic)
                if (aiText.includes('[XP+')) {
                    const match = aiText.match(/\\[XP\+(\d+)\\]/)
                    if (match) this.gameState.stats.xp += parseInt(match[1])
                    aiText = aiText.replace(/\[XP\+\d+\]/, '').trim()
                }
                if (aiText.includes('[HP-')) {
                    const match = aiText.match(/\\[HP-(\d+)\\]/)
                    if (match) this.gameState.stats.hp -= parseInt(match[1])
                    aiText = aiText.replace(/\[HP-\d+\]/, '').trim()
                }

                this.gameState.history.push({ role: 'assistant', content: aiText })

                // Save state
                await this.state.storage.put('gameState', this.gameState)

                // Trigger Workflow if XP is high enough for a "Review" or Level Up
                if (this.gameState.stats.xp >= 100) {
                    // Reset XP for demo purposes or handle leveling in Workflow
                    // await this.env.STORY_WORKFLOW.create({ params: { ...this.gameState } })
                    // For now, let's just level up locally to keep it simple, 
                    // but I'll add the workflow trigger code as commented out or active if I implement the workflow fully.
                    // Actually, the assignment REQUIRES a workflow. 
                    // Let's trigger a "Chapter Summary" workflow every 5 turns.
                    if (this.gameState.history.length % 10 === 0) {
                        try {
                            await this.env.STORY_WORKFLOW.create({
                                id: crypto.randomUUID(),
                                params: {
                                    history: this.gameState.history,
                                    sessionId: this.state.id.toString()
                                }
                            })
                        } catch (e) {
                            console.error("Workflow trigger failed", e)
                        }
                    }
                }

                return Response.json({ response: aiText, state: this.gameState })

            } catch (e) {
                console.error(e)
                return Response.json({ error: 'AI Error' }, 500)
            }
        }

        return new Response('Not Found', { status: 404 })
    }
}
