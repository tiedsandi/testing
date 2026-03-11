You are an expert software architect. I want to build a web application called "Better Prompt" — an AI-powered prompt enhancement tool. Help me design the architecture and development guide. Do NOT write full code yet, only provide high-level architecture, folder structure, pseudocode where necessary, and clear explanations.

---

App Overview:
A web app where users input a rough prompt, and the app transforms it into a well-structured, high-quality prompt. Initially focused on developers (output optimized for GitHub Copilot), but designed to scale for general users later.

---

Core Features to Architect:

1. Prompt Enhancement Engine
   - User inputs a rough prompt
   - App sends it to an AI model with a carefully crafted system prompt
   - Returns an enhanced, structured prompt ready to use

2. Multi-AI Provider Support
   - Default: Gemini (Google AI Studio) + Groq as fallback/fast mode
   - Optional: User can input their own API key (OpenAI, Anthropic, Gemini, Groq)
   - Architecture should make it easy to swap or add providers

3. Prompt Category / Context
   - User can select context: Developer mode (Copilot-ready), General, Writing, etc.
   - Each category uses a different system prompt template

4. Prompt History
   - Store enhanced prompts locally (localStorage)
   - User can revisit, copy, or re-enhance previous prompts

5. One-click Copy UX
   - Smooth copy interaction with visual feedback

---

Tech Stack:
- Framework: Next.js (App Router)
- Styling: Tailwind CSS
- AI calls: handled via API route (server-side to protect keys)
- State management: lightweight (Zustand or React Context)
- Storage: localStorage for history
- Deployment target: Vercel (free tier)

---

What I need from you:
1. Recommended folder & file structure for this project
2. High-level data flow — from user input to enhanced prompt output
3. How to architect the multi-provider AI layer (provider pattern or similar)
4. How the API key management should work (user-provided vs default server key)
5. Pseudocode for the core enhancement flow
6. Any potential pitfalls or things to consider early on

Keep explanations clear. Use pseudocode only where it adds clarity. Think scalability from the start.
