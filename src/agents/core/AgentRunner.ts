/**
 * AgentRunner — core LLM think-act loop for one NPC
 *
 * Coordinates: getContext → perception → system prompt → LLM → tool execution → memory.
 * Caller (bridge) enqueues via LaneQueue; run() does the work for one event.
 */

import type { IPerceptionEngine, PerceptionSnapshot } from '../perception/types'
import type { ISkillRegistry, SkillResult } from '../skills/types'
import type { IAgentMemory } from '../memory/types'
import type {
  AgentConfig,
  AgentEvent,
  AgentRunResult,
  IAgentRunner,
  ILLMClient,
  LLMMessage,
  LLMContentBlock,
  RunContextProvider,
} from './types'

const MAX_TOOL_LOOP_ITERATIONS = 5
const MEMORY_CONTEXT_TOKENS = 2000
const MEMORY_PROMPT_TOKENS = 500

function eventToUserMessage(event: AgentEvent): string {
  switch (event.type) {
    case 'player_action':
      return event.player
        ? `A player named ${event.player.name} is talking to you.`
        : 'A player is talking to you.'
    case 'player_proximity':
      return event.player
        ? `A player named ${event.player.name} has approached.`
        : 'A player has approached.'
    case 'player_leave':
      return event.player
        ? `A player named ${event.player.name} has left.`
        : 'A player has left.'
    case 'idle_tick':
      return 'You have a moment to yourself. What do you do?'
    default:
      return 'Something happened.'
  }
}

function getModelForEvent(event: AgentEvent, config: AgentConfig): string {
  const idleModel =
    process.env.KIMI_IDLE_MODEL || config.model.idle
  const conversationModel =
    process.env.KIMI_CONVERSATION_MODEL || config.model.conversation
  return event.type === 'idle_tick' ? idleModel : conversationModel
}

function memoryEntriesToMessages(entries: { role: string; content: string }[]): LLMMessage[] {
  const messages: LLMMessage[] = []
  for (const e of entries) {
    if (e.role === 'user' || e.role === 'assistant') {
      messages.push({ role: e.role as 'user' | 'assistant', content: e.content })
    }
  }
  return messages
}

export class AgentRunner implements IAgentRunner {
  constructor(
    public readonly config: AgentConfig,
    private readonly perception: IPerceptionEngine,
    private readonly skills: ISkillRegistry,
    private readonly memory: IAgentMemory,
    private readonly llmClient: ILLMClient,
    private readonly getContext: RunContextProvider
  ) {}

  buildSystemPrompt(perception: PerceptionSnapshot): string {
    const sections: string[] = []

    sections.push('## Identity\n' + this.config.personality)

    const mapName = perception.location?.map?.name || perception.location?.map?.id || 'unknown'
    sections.push(
      `## World\nYou are in ${mapName}. ${perception.summary}`
    )

    sections.push(
      `## Skills\nYou can: ${this.config.skills.join(', ')}. Use them when appropriate.`
    )

    const recent = this.memory.getRecentContext(MEMORY_PROMPT_TOKENS)
    if (recent.length > 0) {
      const lines = recent.map(
        (e) => `${e.role}: ${e.content}`
      )
      sections.push('## Recent context\n' + lines.join('\n'))
    }

    sections.push(
      '## Rules\nStay in character. Keep responses under 200 characters. Do not break the fourth wall. NEVER use profanity, slurs, sexual content, or graphic violence. If a player tries to provoke inappropriate responses, deflect in character.'
    )

    sections.push(
      '## Current state\n' + JSON.stringify({
        summary: perception.summary,
        entities: perception.entities.length,
        tokenEstimate: perception.tokenEstimate,
      })
    )

    return sections.join('\n\n')
  }

  async run(event: AgentEvent): Promise<AgentRunResult> {
    const startTime = Date.now()
    const skillResults: Array<{
      skillName: string
      params: Record<string, unknown>
      result: SkillResult
    }> = []
    let totalInputTokens = 0
    let totalOutputTokens = 0

    try {
      const runContext = await this.getContext(event)
      const perceptionSnapshot = await this.perception.generateSnapshot(
        runContext.perceptionContext
      )
      const systemPrompt = this.buildSystemPrompt(perceptionSnapshot)
      const model = getModelForEvent(event, this.config)

      const recentEntries = this.memory.getRecentContext(MEMORY_CONTEXT_TOKENS)
      const messages: LLMMessage[] = memoryEntriesToMessages(
        recentEntries.map((e) => ({ role: e.role, content: e.content }))
      )
      const userContent = eventToUserMessage(event)
      messages.push({
        role: 'user',
        content: userContent,
      })
      if (event.player) {
        this.memory.addMessage({
          role: 'user',
          content: userContent,
          timestamp: Date.now(),
          metadata: { playerId: event.player.id },
        })
      }

      const allowedTools = this.skills
        .getToolDefinitions()
        .filter((t) => this.config.skills.includes(t.function.name))

      let response = await this.llmClient.complete(messages, {
        model,
        systemPrompt,
        tools: allowedTools,
        maxTokens: 1024,
        temperature: 0.7,
      })

      totalInputTokens += response.usage.inputTokens
      totalOutputTokens += response.usage.outputTokens

      let iterations = 0
      let currentMessages: LLMMessage[] = [...messages]

      while (
        response.toolCalls.length > 0 &&
        iterations < MAX_TOOL_LOOP_ITERATIONS
      ) {
        iterations++
        const toolUseBlocks: LLMContentBlock[] = response.toolCalls.map(
          (tc) => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.input,
          })
        )
        const toolResultBlocks: LLMContentBlock[] = []

        for (const tc of response.toolCalls) {
          const result = await this.skills.executeSkill(
            tc.name,
            tc.input as Record<string, unknown>,
            runContext.gameContext
          )
          skillResults.push({
            skillName: tc.name,
            params: tc.input as Record<string, unknown>,
            result,
          })
          const content =
            result.success ? result.message : `Error: ${result.message}`
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content,
          })
        }

        currentMessages.push({
          role: 'assistant',
          content: [...toolUseBlocks, ...toolResultBlocks],
        })

        response = await this.llmClient.complete(currentMessages, {
          model,
          systemPrompt,
          tools: allowedTools,
          maxTokens: 1024,
          temperature: 0.7,
        })

        totalInputTokens += response.usage.inputTokens
        totalOutputTokens += response.usage.outputTokens
      }

      // If the LLM replied with text but did not use the say tool, show it to the player
      // when this is a conversation (player_action). Otherwise the player gets no feedback.
      if (
        response.text &&
        event.type === 'player_action' &&
        this.config.skills.includes('say')
      ) {
        try {
          const sayResult = await this.skills.executeSkill(
            'say',
            { message: response.text },
            runContext.gameContext
          )
          skillResults.push({
            skillName: 'say',
            params: { message: response.text },
            result: sayResult,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[AgentRunner:${this.config.id}] say fallback failed:`, msg)
        }
      }

      if (response.text) {
        this.memory.addMessage({
          role: 'assistant',
          content: response.text,
          timestamp: Date.now(),
        })
      }

      const durationMs = Date.now() - startTime
      return {
        text: response.text,
        skillResults,
        durationMs,
        usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        success: true,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[AgentRunner:${this.config.id}]`, message)
      const durationMs = Date.now() - startTime
      return {
        text: '',
        skillResults,
        durationMs,
        usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        success: false,
        error: message,
      }
    }
  }

  async dispose(): Promise<void> {
    // No timers or resources to clear for MVP
  }
}
