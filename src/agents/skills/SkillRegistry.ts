/**
 * SkillRegistry Implementation
 *
 * Manages the set of skills available to an agent and converts them
 * to OpenAI-compatible tool definitions for function calling with Kimi K2/K2.5.
 */

import type {
  IAgentSkill,
  ISkillRegistry,
  SkillResult,
  GameContext,
  SkillParameterSchema,
  OpenAIToolDefinition,
} from './types'

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Convert a SkillParameterSchema to JSON Schema format for OpenAI.
 */
function convertParameterSchemaToJSONSchema(
  schema: SkillParameterSchema
): Record<string, unknown> {
  const jsonSchema: Record<string, unknown> = {
    type: schema.type,
  }

  if (schema.description) {
    jsonSchema.description = schema.description
  }

  if (schema.enum) {
    jsonSchema.enum = schema.enum
  }

  if (schema.default !== undefined) {
    jsonSchema.default = schema.default
  }

  return jsonSchema
}

/**
 * Extract required parameter names from a skill's parameter schema.
 * Parameters are required by default unless `required: false` is explicitly set.
 */
function getRequiredParams(
  parameters: Record<string, SkillParameterSchema>
): string[] {
  return Object.entries(parameters)
    .filter(([_, schema]) => schema.required !== false)
    .map(([name]) => name)
}

// ---------------------------------------------------------------------------
// SkillRegistry Class
// ---------------------------------------------------------------------------

/**
 * Registry that manages available skills and converts them to OpenAI tool definitions.
 */
export class SkillRegistry implements ISkillRegistry {
  private skills = new Map<string, IAgentSkill>()

  /**
   * Register a skill so it becomes available to the agent.
   *
   * @param skill - The skill to register.
   * @throws If a skill with the same name is already registered.
   */
  register(skill: IAgentSkill): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill "${skill.name}" is already registered`)
    }
    this.skills.set(skill.name, skill)
  }

  /**
   * Retrieve a skill by name.
   *
   * @param name - The skill name.
   * @returns The skill, or `undefined` if not found.
   */
  get(name: string): IAgentSkill | undefined {
    return this.skills.get(name)
  }

  /**
   * Return all registered skills.
   */
  getAll(): ReadonlyArray<IAgentSkill> {
    return Array.from(this.skills.values())
  }

  /**
   * Convert all registered skills into OpenAI-compatible tool definitions.
   *
   * @returns An array of tool definition objects ready for the
   *          `tools` parameter of the OpenAI Chat Completions API.
   */
  getToolDefinitions(): ReadonlyArray<OpenAIToolDefinition> {
    return Array.from(this.skills.values()).map((skill) => {
      // Convert SkillParameterSchema → JSON Schema properties
      const properties: Record<string, unknown> = {}
      for (const [paramName, paramSchema] of Object.entries(skill.parameters)) {
        properties[paramName] = convertParameterSchemaToJSONSchema(paramSchema)
      }

      // Extract required parameters
      const required = getRequiredParams(skill.parameters)
      const requiredArray =
        required.length > 0 ? (required as ReadonlyArray<string>) : undefined

      // Build OpenAI-compatible format
      return {
        type: 'function' as const,
        function: {
          name: skill.name,
          description: skill.description,
          parameters: {
            type: 'object' as const,
            properties,
            ...(requiredArray ? { required: requiredArray } : {}),
          },
        },
      }
    })
  }

  /**
   * Execute a skill by name with the given parameters and context.
   *
   * @param name - The skill name.
   * @param params - The parameter values provided by the LLM.
   * @param context - Runtime game context.
   * @returns The skill execution result.
   */
  async executeSkill(
    name: string,
    params: Record<string, unknown>,
    context: GameContext
  ): Promise<SkillResult> {
    const skill = this.skills.get(name)
    if (!skill) {
      return {
        success: false,
        message: `Skill "${name}" not found`,
        error: 'skill_not_found',
      }
    }

    // Validate parameters
    const validationError = this.validateParams(params, skill.parameters)
    if (validationError) {
      return {
        success: false,
        message: validationError,
        error: 'invalid_params',
      }
    }

    // Execute the skill (skills catch their own errors)
    return await skill.execute(params, context)
  }

  /**
   * Validate parameters against the skill's schema.
   *
   * @param params - The parameters to validate.
   * @param schema - The skill's parameter schema.
   * @returns Error message if validation fails, or null if valid.
   */
  private validateParams(
    params: Record<string, unknown>,
    schema: Record<string, SkillParameterSchema>
  ): string | null {
    // Check required parameters
    const required = getRequiredParams(schema)
    for (const paramName of required) {
      if (!(paramName in params) || params[paramName] === undefined) {
        return `Missing required parameter: ${paramName}`
      }
    }

    // Validate enum values
    for (const [paramName, paramSchema] of Object.entries(schema)) {
      if (paramName in params && paramSchema.enum) {
        const value = params[paramName]
        if (!paramSchema.enum.includes(value as string | number)) {
          return `Invalid value for ${paramName}: ${value}. Must be one of: ${paramSchema.enum.join(', ')}`
        }
      }
    }

    return null
  }
}

