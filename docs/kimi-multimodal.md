# Kimi Multi-modal Capabilities Guide

## Overview

Kimi K2.5 and several Moonshot models support **multi-modal input** — they can process both text and images in the same request. This enables use cases like UI screenshot review, diagram analysis, and visual debugging.

## Supported Models

| Model | Image Input | Context | Notes |
|-------|-------------|---------|-------|
| `kimi-k2.5` | Yes | 256K tokens | Latest model, full capabilities |
| `kimi-latest` | Yes | 128K tokens | Alias for latest stable |
| `moonshot-v1-128k-vision-preview` | Yes | 128K tokens | Vision-specific |
| `moonshot-v1-32k-vision-preview` | Yes | 32K tokens | Smaller context |
| `moonshot-v1-8k-vision-preview` | Yes | 8K tokens | Smallest context |

## Image Input Format

Moonshot API accepts images as **base64-encoded data URIs** in the OpenAI-compatible message format:

```json
{
  "model": "moonshot-v1-8k-vision-preview",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Describe this UI screenshot."},
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,iVBORw0KGgo..."
          }
        }
      ]
    }
  ]
}
```

### Important Limitations

- **No external URLs**: Moonshot does not fetch images from external URLs. You must encode images as base64 data URIs.
- **Supported formats**: PNG, JPEG (verified). Other formats may work but are untested.
- **Image size**: Large images consume significant tokens. A 10x10 PNG uses ~1,000 prompt tokens. Resize large screenshots before sending.
- **Base64 encoding**: Use `data:image/png;base64,<base64-data>` or `data:image/jpeg;base64,<base64-data>` format.

## Using Multi-modal via API

### Python Example

```python
import base64
import json
import urllib.request

# Read and encode the image
with open("screenshot.png", "rb") as f:
    b64_image = base64.b64encode(f.read()).decode()

# Build the API request
api_key = "your-api-key"
payload = json.dumps({
    "model": "moonshot-v1-8k-vision-preview",
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Review this UI screenshot for accessibility issues."},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{b64_image}"}
                }
            ]
        }
    ],
    "max_tokens": 500
}).encode()

req = urllib.request.Request(
    "https://api.moonshot.ai/v1/chat/completions",
    data=payload,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
)

with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print(result["choices"][0]["message"]["content"])
```

### Shell Example

```bash
# Encode image to base64
B64=$(base64 < screenshot.png)

# Call the API
curl -s -X POST "https://api.moonshot.ai/v1/chat/completions" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"moonshot-v1-8k-vision-preview\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": [
        {\"type\": \"text\", \"text\": \"Describe this image.\"},
        {\"type\": \"image_url\", \"image_url\": {\"url\": \"data:image/png;base64,$B64\"}}
      ]
    }],
    \"max_tokens\": 200
  }"
```

## Using Multi-modal via Kimi CLI

Kimi CLI's interactive mode and web interface support image input natively when using a vision-capable model. The `--model` flag can specify a vision model:

```bash
# Use a vision model explicitly
kimi --model moonshot-v1-8k-vision-preview

# K2.5 (default) already supports vision
kimi
```

In the web interface (`kimi web`), images can be uploaded directly through the browser UI.

## Use Cases in Open Artel Workflow

### 1. UI Screenshot Review

When the Lovable agent submits UI work, the reviewer can use vision to verify the implementation matches the design:

```
Task(subagent_name="reviewer-TASK-101", prompt="""
Review the UI implementation for TASK-101.
Compare the screenshot at .ai/reviews/TASK-101-screenshot.png
against the design spec in .ai/tasks/TASK-101.md.
Check: layout, colors, typography, spacing, accessibility.
""")
```

See `.ai/patterns/multimodal-ui-review.md` for the full pattern.

### 2. Diagram Analysis

Analyze architecture diagrams, flowcharts, or wireframes:

```python
# Upload a Mermaid-rendered diagram for analysis
payload = {
    "model": "moonshot-v1-8k-vision-preview",
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": "Does this architecture diagram match our AGENTS.md?"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{diagram_b64}"}}
        ]
    }]
}
```

### 3. Visual Debugging

When a UI bug is reported with a screenshot, the debugger subagent can analyze it:

```python
CreateSubagent(
    name="visual-debugger-TASK-123",
    system_prompt="You are a Visual Debugger. Analyze UI screenshots to identify rendering issues..."
)
Task(
    subagent_name="visual-debugger-TASK-123",
    prompt="Analyze this screenshot showing a layout bug in the dashboard..."
)
```

## Best Practices

### 1. Resize Images Before Sending

Large images consume many tokens. Resize to the minimum resolution needed:

- UI screenshots: 800x600 is usually sufficient
- Icons/small elements: 200x200
- Full-page screenshots: 1200x800 max

### 2. Choose the Right Model

- **Quick checks** (color, layout): `moonshot-v1-8k-vision-preview` (cheapest)
- **Detailed analysis**: `moonshot-v1-128k-vision-preview` (more context for complex images)
- **Full workflow** (vision + tools): `kimi-k2.5` (supports vision + all tools)

### 3. Combine Text and Image Context

Always provide text context alongside images:

```json
{
  "content": [
    {"type": "text", "text": "This is a login page. Check if the error state is displayed correctly."},
    {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
  ]
}
```

### 4. Token Budget Awareness

Images are tokenized internally. A typical screenshot uses 1,000-5,000 tokens depending on resolution. Monitor your token budget with `scripts/kimi-context-monitor.sh`.

## Troubleshooting

### "Unsupported image url"

Moonshot does not support external URLs. Encode images as base64 data URIs:

```
data:image/png;base64,<base64-encoded-data>
```

### "Failed to decode image"

The image may be too small, corrupt, or in an unsupported format. Ensure:

- Image is at least 10x10 pixels
- Format is PNG or JPEG
- Base64 encoding is correct (no line breaks in the data URI)

### High Token Usage

Images consume significant tokens. To reduce usage:

- Resize images before sending
- Use the smallest vision model that meets your needs
- Crop to the relevant area instead of sending full screenshots

