/**
 * LLMClient — OpenAI SDK wrapper for Moonshot (Kimi) API
 *
 * Implements ILLMClient using the openai package pointed at
 * https://api.moonshot.ai/v1. Used by AgentRunner for idle and conversation.
 */

import 'dotenv/config'
import OpenAI from 'openai'
import type {
  ILLMClient,
  LLMMessage,
  LLMContentBlock,
  LLMCompletionOptions,
  LLMResponse,
  LLMToolCall,
} from './types'

const MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1'

function resolveApiKey(): string {
  const key = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY
  if (!key) {
    throw new Error(
      '[LLMClient] No API key. Set MOONSHOT_API_KEY or KIMI_API_KEY.'
    )
  }
  return key
}

/**
 * Map our LLMMessage[] to OpenAI ChatCompletionMessageParam[].
 * Handles user, assistant (text or tool_use), and tool_result as role 'tool'.
 */
function mapMessagesToOpenAI(
  messages: ReadonlyArray<LLMMessage>
): OpenAI.ChatCompletionMessageParam[] {
  const out: OpenAI.ChatCompletionMessageParam[] = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      const content = typeof msg.content === 'string' ? msg.content : ''
      out.push({ role: 'user', content })
      continue
    }

    // assistant
    if (typeof msg.content === 'string') {
      out.push({ role: 'assistant', content: msg.content })
      continue
    }

    const blocks = msg.content as ReadonlyArray<LLMContentBlock>
    let assistantContent = ''
    const toolCalls: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }> = []
    const toolResults: Array<{ tool_use_id: string; content: string }> = []

    for (const block of blocks) {
      if (block.type === 'text') {
        assistantContent += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input || {}),
          },
        })
      } else if (block.type === 'tool_result') {
        toolResults.push({
          tool_use_id: block.tool_use_id,
          content: block.content,
        })
      }
    }

    if (toolCalls.length > 0) {
      out.push({
        role: 'assistant',
        content: assistantContent || undefined,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      })
      for (const tr of toolResults) {
        out.push({
          role: 'tool',
          content: tr.content,
          tool_call_id: tr.tool_use_id,
        })
      }
    } else {
      out.push({ role: 'assistant', content: assistantContent || '(no content)' })
    }
  }

  return out
}

/**
 * Map OpenAI response to our LLMResponse.
 */
function mapResponse(
  completion: OpenAI.Chat.Completions.ChatCompletion
): LLMResponse {
  const choice = completion.choices?.[0]
  const msg = choice?.message
  const content = msg?.content
  const text = typeof content === 'string' ? content : ''

  const toolCalls: LLMToolCall[] = (msg?.tool_calls || [])
    .filter((tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function')
    .map((tc) => ({
      id: tc.id,
      name: tc.function?.name || '',
      input: (() => {
        try {
          return JSON.parse(tc.function?.arguments || '{}') as Record<string, unknown>
        } catch {
          return {}
        }
      })(),
    }))

  const finishReason = choice?.finish_reason
  let stopReason: LLMResponse['stopReason'] = 'end_turn'
  if (finishReason === 'tool_calls') stopReason = 'tool_use'
  else if (finishReason === 'length') stopReason = 'max_tokens'
  else if (finishReason === 'stop') stopReason = 'end_turn'

  const usage = completion.usage
  const inputTokens = usage?.prompt_tokens ?? 0
  const outputTokens = usage?.completion_tokens ?? 0

  return {
    text,
    toolCalls,
    stopReason,
    usage: { inputTokens, outputTokens },
  }
}

export class LLMClient implements ILLMClient {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: resolveApiKey(),
      baseURL: MOONSHOT_BASE_URL,
    })
  }

  async complete(
    messages: ReadonlyArray<LLMMessage>,
    options: LLMCompletionOptions
  ): Promise<LLMResponse> {
    const openAIMessages = mapMessagesToOpenAI(messages)

    const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: options.model,
      messages: openAIMessages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    }

    if (options.systemPrompt) {
      body.messages = [
        { role: 'system', content: options.systemPrompt },
        ...openAIMessages,
      ]
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }))
    }

    try {
      const completion = await this.client.chat.completions.create(body)
      return mapResponse(completion)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('401') || message.includes('Incorrect API key')) {
        throw new Error(`[LLMClient] auth_error: ${message}`)
      }
      if (message.includes('429') || message.includes('rate')) {
        throw new Error(`[LLMClient] rate_limit: ${message}`)
      }
      if (message.includes('context') || message.includes('token')) {
        throw new Error(`[LLMClient] context_overflow: ${message}`)
      }
      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        throw new Error(`[LLMClient] timeout: ${message}`)
      }
      throw err
    }
  }
}
