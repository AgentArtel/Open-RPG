## TASK-023: Examiner NPC + Test Runner

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P2-Medium
- **Phase**: 7 (Agent Evaluation Arena)
- **Type**: Create
- **Depends on**: TASK-022 (schema + test definitions)
- **Blocks**: TASK-024 (profiles depend on test results)

### Context

With the evaluation schema in place (TASK-022), this task builds the test execution
engine. An ExaminerNPC presents challenges to subject agents, collects their responses,
and scores them using either LLM-as-judge (for subjective tests like creativity) or
structured matching (for factual tests like memory recall).

Examiner NPCs are **scripted** — they follow a test script, not an AI model. They
use the existing AgentRunner infrastructure to present challenges but have no LLM
of their own.

### Objective

Build the ExaminerNPC class and ResponseEvaluator that can run a test suite against
any agent, score responses, and store results in `agent_test_results`.

### Specifications

**Create:** `src/agents/evaluation/ExaminerNPC.ts`

```typescript
import { AgentTest, TestResult } from './types'

export class ExaminerNPC {
  constructor(
    private testSuite: AgentTest[],
    private evaluator: ResponseEvaluator,
    private supabase: SupabaseClient
  ) {}

  /**
   * Run a single test against a subject agent.
   * Presents the test prompt as a player_action event from "The Elder".
   */
  async runTest(subjectAgent: AgentRunner, test: AgentTest): Promise<TestResult> {
    // 1. Create an AgentEvent simulating the examiner speaking
    const event: AgentEvent = {
      type: 'player_action',
      playerId: 'examiner',
      playerName: 'The Elder',
      message: test.prompt,
      timestamp: Date.now(),
    }

    // 2. Run through normal AgentRunner pipeline
    const startTime = Date.now()
    const result = await subjectAgent.run(event)
    const latencyMs = Date.now() - startTime

    // 3. Score the response
    const score = await this.evaluator.evaluate(test, result)

    // 4. Store result in Supabase
    await this.storeResult(subjectAgent.agentId, test, score, result, latencyMs)

    return score
  }

  /**
   * Run all tests in the suite sequentially.
   * Returns individual results + aggregate scores by dimension.
   */
  async runSuite(subjectAgent: AgentRunner): Promise<SuiteResult> {
    const results: TestResult[] = []
    for (const test of this.testSuite) {
      results.push(await this.runTest(subjectAgent, test))
    }
    return {
      results,
      aggregate: this.aggregate(results),
      agentId: subjectAgent.agentId,
      timestamp: new Date().toISOString()
    }
  }

  private aggregate(results: TestResult[]): Record<string, number> {
    // Group by test_type, average scores per dimension
    // Returns: { creativity: 85, reasoning: 72, ... }
  }

  private async storeResult(...): Promise<void> {
    // Insert into agent_test_results table
  }
}
```

**Create:** `src/agents/evaluation/ResponseEvaluator.ts`

Two scoring strategies:

```typescript
export class ResponseEvaluator {
  constructor(private llmClient: LLMClient) {}

  async evaluate(test: AgentTest, response: AgentRunResult): Promise<TestResult> {
    if (test.expected) {
      return this.evaluateStructured(test, response)
    }
    return this.evaluateWithLLM(test, response)
  }

  /**
   * LLM-as-judge for subjective tests (creativity, social, adaptability).
   * Uses a DIFFERENT model than the agent to avoid self-evaluation bias.
   */
  async evaluateWithLLM(test: AgentTest, response: AgentRunResult): Promise<TestResult> {
    const evaluation = await this.llmClient.complete([{
      role: 'system',
      content: `You are an impartial judge evaluating an AI agent's response.
Score each criterion on a 0-${test.maxScore / test.rubric.criteria.length} scale.
Rubric: ${JSON.stringify(test.rubric)}
Return JSON only: { "scores": { "criterion_name": number, ... }, "overall": number, "feedback": "string" }`
    }, {
      role: 'user',
      content: `Challenge: ${test.prompt}\nAgent response: ${response.text}`
    }])
    return JSON.parse(evaluation.text)
  }

  /**
   * Structured matching for factual tests (memory, reasoning).
   * Compares against expected answers. Supports partial credit.
   */
  evaluateStructured(test: AgentTest, response: AgentRunResult): TestResult {
    // Compare response.text against test.expected
    // Award partial credit for partially correct responses
    // Example: 3/5 expected facts mentioned = 60 score
  }
}
```

**Key design decisions:**

1. **Judge model separation:** If the agent runs on Kimi K2, judge with K2.5 or
   a different provider. The ResponseEvaluator should accept its own LLMClient
   instance configured for the judge model.

2. **Sequential test execution:** Tests run one at a time to avoid overloading
   the agent's LLM context. Each test is independent — no conversation carry-over
   between tests.

3. **Normal AgentRunner pipeline:** The examiner feeds events through the same
   `AgentRunner.run()` pipeline used by real players. This tests the agent as
   it actually operates, not a synthetic version.

4. **Error handling:** If the agent fails to respond (timeout, LLM error), score
   is 0 for that test with `details: { error: "..." }`. Never crash the test suite.

**Create:** `src/agents/evaluation/index.ts`

Export all evaluation classes and types for clean imports.

### Acceptance Criteria

- [ ] ExaminerNPC can run a single test against any AgentRunner instance
- [ ] ExaminerNPC can run a full test suite and return aggregate results
- [ ] ResponseEvaluator scores subjective tests via LLM-as-judge
- [ ] ResponseEvaluator scores factual tests via structured matching
- [ ] Judge model is configurable and separate from agent model
- [ ] Test results stored in `agent_test_results` with all fields populated
- [ ] Agent failure during test → score 0 with error details (no crash)
- [ ] Sequential execution: tests don't interfere with each other
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for `evaluateStructured()` with known inputs/outputs

### Do NOT

- Make the ExaminerNPC AI-driven (it follows a script, not an LLM)
- Add conversation memory between tests (each test is independent)
- Build the profile aggregation (TASK-024)
- Create an API endpoint for triggering evaluations (TASK-026)
- Add real-time progress reporting (future enhancement)
- Import or depend on RPGJS — evaluation runs server-side only

### Reference

- Feature idea: `.ai/idea/10-agent-evaluation-arena.md`
- Implementation plan: `.ai/idea/10a-agent-evaluation-implementation-plan.md` (Step 2)
- AgentRunner: `src/agents/core/AgentRunner.ts`
- LLMClient: `src/agents/core/LLMClient.ts`
- AgentEvent type: `src/agents/types.ts`

### Handoff Notes

_(To be filled by implementer)_
