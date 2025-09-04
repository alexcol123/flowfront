# Testing Workflow Chat Page

## How to Test with chat-working-backend.json

1. **Navigate to the workflow-chat page**: `/workflow-chat`
2. **Use the workflow name**: `chat-working-backend`
3. **Expected results in Step 4**:

### ✅ What Should Display:

**Chat Trigger Details:**
- Name: "When chat message received"
- Type: "@n8n/n8n-nodes-langchain.chatTrigger"  
- Webhook ID: "4dae2e3e-b61c-4de1-bc35-6bce2f79064c"
- Public Access: Yes
- Node ID: "454bedde-2432-47c3-90f4-c053f14313fe"

**Connected Workflow Nodes:**
- AI Models: OpenAI Chat Model (gpt-4o-mini)
- AI Agents: AI Agent

**Smart Webhook URL Helper:**
- Expected format: `https://your-instance.n8n.cloud/webhook/4dae2e3e-b61c-4de1-bc35-6bce2f79064c`

## Testing URLs:

- **Workflow Chat**: `/workflow-chat?workflowName=chat-working-backend`
- **Regular Workflow**: `/workflow/chat-working-backend` (will show error explaining it's a chat workflow)

## Key Differences:

- **workflow-chat page**: Designed for `@n8n/n8n-nodes-langchain.chatTrigger`
- **workflow page**: Designed for `n8n-nodes-base.formTrigger`

The workflow page will now show a helpful error message explaining why it can't extract form data and suggesting to use the workflow-chat page instead.