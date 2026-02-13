import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers'

interface Env {
  AI: any
}

type WorkflowParams = {
  history: { role: string; content: string }[]
  sessionId: string
}

export class LevelUpWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { history, sessionId } = event.payload

    const summary = await step.do('generate-summary', async () => {
      const response: any = await this.env.AI.run('@cf/meta/llama-3.3-71b-instruct-awq', {
        messages: [
            { role: 'system', content: 'Summarize the following story adventure so far in one epic sentence.' },
            ...history.slice(-20)
        ]
      })
      return response.response
    })

    const title = await step.do('generate-title', async () => {
        const response: any = await this.env.AI.run('@cf/meta/llama-3.3-71b-instruct-awq', {
            messages: [
                { role: 'system', content: `Create a book chapter title for this summary: "${summary}"` }
            ]
        })
        return response.response
    })

    // In a real app, we might write this back to the DO or a database.
    // For now, we will log it.
    console.log(`WORKFLOW COMPLETE: Session ${sessionId} -> Chapter: ${title} - ${summary}`)
    
    return { title, summary }
  }
}
