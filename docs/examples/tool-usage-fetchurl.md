# FetchURL Tool Usage Example

## Tool Reference

- **Tool name**: `FetchURL`
- **Module**: `kimi_cli.tools.web:FetchURL`
- **Purpose**: Fetch and read content from a specific URL

## When to Use

- Reading specific documentation pages you already know the URL for
- Getting API specifications or changelogs
- Fetching reference materials to include in task briefs
- Verifying that a submitted implementation matches official documentation
- Downloading style guides or design system references

## When NOT to Use

- When you don't know the URL (use SearchWeb first to find it)
- When the content is already in the project (use ReadFile instead)
- For general research (use SearchWeb instead)

## Example Usage

### Verify API documentation during review

```
FetchURL(url="https://platform.moonshot.ai/docs/api/files")
```

Use this when reviewing a submission that calls the Moonshot Files API — verify the implementation matches the actual API contract.

### Get library changelog before task assignment

```
FetchURL(url="https://github.com/vercel/next.js/releases/tag/v15.0.0")
```

Use this when a task involves a specific library version, to understand what changed and include relevant notes in the task brief.

### Read design system documentation

```
FetchURL(url="https://ui.shadcn.com/docs/components/button")
```

Use this when assigning a UI task to Lovable, to include the correct component API in the task brief.

## Real-World Use Case

**Scenario**: An agent submits work for TASK-012 that implements a Moonshot API integration. During review, you want to verify the API call format is correct:

```
FetchURL(url="https://platform.moonshot.ai/docs/api/chat-completion")
```

You compare the fetched documentation against the submitted code. If the request body format doesn't match, you reject with specific feedback referencing the official docs. This produces more credible, evidence-based reviews.

