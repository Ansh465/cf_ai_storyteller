import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
    STORY_DO: DurableObjectNamespace
    AI: any
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', async (c) => {
    return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Infinite Storyteller</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background-color: #1a1a1a; color: #e5e5e5; font-family: 'Inter', sans-serif; }
        .chat-container { height: calc(100vh - 180px); overflow-y: auto; }
        .markdown prose { color: #d4d4d4; }
        .markdown p { margin-bottom: 0.5em; }
      </style>
    </head>
    <body class="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <header class="mb-4 flex justify-between items-center text-emerald-400 border-b border-gray-700 pb-2">
        <h1 class="text-2xl font-bold">Infinite Storyteller</h1>
        <div id="stats" class="text-sm text-gray-400">Level: 1 | HP: 100</div>
      </header>
      
      <main id="chat" class="chat-container flex-grow space-y-4 pr-2 mb-4 scroll-smooth">
        <!-- Chat messages will appear here -->
        <div class="text-center text-gray-500 mt-10">Starting your adventure...</div>
      </main>

      <footer class="mt-auto">
        <form id="chat-form" class="flex gap-2">
          <input type="text" id="user-input" 
            class="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder="What do you want to do?" autocomplete="off" disabled>
          <button type="submit" id="send-btn" 
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50" disabled>
            Action
          </button>
        </form>
      </footer>

      <script>
        const sessionId = localStorage.getItem('story_session') || crypto.randomUUID();
        localStorage.setItem('story_session', sessionId);
        
        const chatEl = document.getElementById('chat');
        const formEl = document.getElementById('chat-form');
        const inputEl = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        const statsEl = document.getElementById('stats');

        let isLoading = false;

        function addMessage(role, text) {
          const div = document.createElement('div');
          div.className = \`p-3 rounded-lg max-w-[85%] \${role === 'user' ? 'bg-gray-800 self-end ml-auto' : 'bg-emerald-900/20 border border-emerald-900/50 self-start mr-auto'}\`;
          div.innerHTML = \`<div class="font-xs text-xs opacity-50 mb-1 uppercase tracking-wider">\${role === 'user' ? 'You' : 'DM'}</div><div class="markdown prose prose-invert">\${text}</div>\`;
          chatEl.appendChild(div);
          chatEl.scrollTop = chatEl.scrollHeight;
        }

        function updateStats(state) {
          if (state && state.stats) {
            statsEl.innerText = \`Level: \${state.stats.level} | HP: \${state.stats.hp} | XP: \${state.stats.xp}\`;
          }
        }

        async function fetchState() {
          try {
            const res = await fetch(\`/api/state?sessionId=\${sessionId}\`);
            const data = await res.json();
            chatEl.innerHTML = ''; // limited history for now, or append?
            // For now, just render whatever history the server returns
            if (data.history && data.history.length > 0) {
               data.history.forEach(msg => {
                 // skip system prompts if any leaks
                 if(msg.role !== 'system') addMessage(msg.role, msg.content);
               });
            } else {
               // Initial greeting if empty
               sendMessage("Start Game");
            }
            updateStats(data);
            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.focus();
          } catch (e) {
            console.error(e);
          }
        }

        async function sendMessage(text) {
          if (isLoading) return;
          isLoading = true;
          inputEl.disabled = true;
          sendBtn.disabled = true;
          
          if(text !== "Start Game") addMessage('user', text);

          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, message: text })
            });
            const data = await res.json();
            addMessage('assistant', data.response);
            updateStats(data.state);
          } catch (e) {
            addMessage('system', 'Error connecting to the infinite realms...');
          } finally {
            isLoading = false;
            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.value = '';
            inputEl.focus();
          }
        }

        formEl.addEventListener('submit', (e) => {
          e.preventDefault();
          const text = inputEl.value.trim();
          if (text) sendMessage(text);
        });

        // Initial load
        fetchState();
      </script>
    </body>
    </html>
  `)
})

app.all('/api/*', async (c) => {
    const url = new URL(c.req.url)
    const sessionId = url.searchParams.get('sessionId') || (await c.req.json().catch(() => ({}))).sessionId

    if (!sessionId) {
        return c.json({ error: 'Session ID required' }, 400)
    }

    const id = c.env.STORY_DO.idFromName(sessionId)
    const stub = c.env.STORY_DO.get(id)

    return stub.fetch(c.req.raw)
})

export default app
export { StoryDO } from './gameDO'
export { LevelUpWorkflow } from './workflow'
