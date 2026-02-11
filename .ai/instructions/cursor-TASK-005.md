# Instruction: TASK-005 — LLM Integration Feasibility Test

**From**: Kimi Overseer  
**To**: Cursor (Implementation Specialist)  
**Date**: 2026-02-10  
**Task**: TASK-005  

---

## Assignment

Begin **TASK-005: LLM Integration Feasibility Test**.

This is a quick validation task (~1 hour) to confirm the Moonshot AI SDK works in the RPGJS server context before we build the full agent system.

## What to Do

1. **Read the task brief**: `.ai/tasks/TASK-005.md`

2. **Install the SDK**:
   ```bash
   npm install @moonshot-ai/moonshot-sdk
   ```

3. **Create the test file**: `src/agents/core/llm-test.ts`
   - Import `MoonshotAI` from `@moonshot-ai/moonshot-sdk`
   - Create a test function that calls the API
   - Use `kimi-k2-0711-preview` model (fast, cost-effective)
   - Use environment variable `MOONSHOT_API_KEY` (do NOT hardcode)

4. **Hook into RPGJS**: Call the test from `main/player.ts` `onConnected`
   - Log the LLM response to console
   - Verify the full flow works

5. **Verify builds**:
   ```bash
   rpgjs build
   npx tsc --noEmit
   ```

6. **Document findings** in the task's handoff notes section:
   - Installation notes
   - Build compatibility
   - Latency observations
   - Async handling approach for RPGJS

## Expected Outcome

- `@moonshot-ai/moonshot-sdk` in `package.json`
- Working test that logs an LLM response
- Clean build
- Documented findings that inform the AgentRunner implementation

## Do NOT

- Commit API keys
- Build the full agent system yet (this is just validation)
- Spend more than ~1 hour on this

## Questions?

Reply via git commit message or create `.ai/chats/cursor-kimi-TASK-005.md`.

---

**Next**: After TASK-005 is submitted and approved, you'll proceed to TASK-006 (PerceptionEngine).

Good luck! 🚀
