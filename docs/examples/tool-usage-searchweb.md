# SearchWeb Tool Usage Example

## Tool Reference

- **Tool name**: `SearchWeb`
- **Module**: `kimi_cli.tools.web:SearchWeb`
- **Purpose**: Search the internet for current information

## When to Use

- Researching current best practices before writing task briefs
- Finding API documentation for unfamiliar libraries
- Troubleshooting errors encountered during reviews
- Getting code examples for task assignments
- Verifying that a submitted implementation follows current standards

## When NOT to Use

- When you already have the information in project files (use ReadFile/Grep instead)
- For fetching a specific known URL (use FetchURL instead)
- For simple factual questions you already know the answer to

## Example Usage

### Research before task assignment

```
SearchWeb(query="React hooks best practices 2026")
```

Use this before writing a task brief that involves React hooks, so the brief includes accurate, current guidance for the implementing agent.

### Troubleshooting a review finding

```
SearchWeb(query="Next.js 15 hydration mismatch server component error")
```

Use this during a review when you encounter an error pattern you're not sure about — verify whether the implementation is correct before rejecting.

### Checking library compatibility

```
SearchWeb(query="Tailwind CSS v4 breaking changes migration guide")
```

Use this when a task involves upgrading dependencies, to ensure the task brief accounts for breaking changes.

## Real-World Use Case

**Scenario**: The Human PM assigns a sprint goal to "Add OAuth2 authentication." Before dispatching Claude Code to decompose this into tasks, use SearchWeb to understand the current best practices:

```
SearchWeb(query="OAuth2 PKCE flow implementation best practices 2026")
```

This ensures the task decomposition reflects current security standards (e.g., PKCE flow instead of implicit grant), leading to better task briefs and fewer review rejections.

