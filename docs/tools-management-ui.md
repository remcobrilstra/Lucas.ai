# Tools Management UI

## Overview
The Tools Management interface allows you to create, edit, and delete tools that agents can use. Located at `/tools` in the dashboard.

## Features

### 1. **View All Tools**
- Grid layout showing all tools (built-in, MCP local, MCP remote, custom)
- Tool cards display:
  - Icon based on category
  - Display name
  - Category badge
  - Type badge with icon (color-coded)
  - Description
  - Edit and Delete buttons

### 2. **Tool Type Badges**
- **Built-in** (Blue): Code executed within the application
- **MCP Local** (Green): Local MCP server via stdio
- **MCP Remote** (Purple): Remote MCP server via HTTP
- **Custom** (Orange): Organization-specific tools

### 3. **Create Tool**
Click "Create Tool" button to open the creation dialog.

#### Required Fields:
- **Name (ID)**: Unique identifier (e.g., `calculator`, `web_search`)
  - Cannot be changed after creation
  - Used in function calls
- **Display Name**: User-friendly name shown in UI
- **Description**: What the tool does
- **Category**: Tool category (e.g., `math`, `search`, `datetime`)
- **Type**: Tool type (built-in, mcp-local, mcp-remote, custom)
- **Schema**: OpenAI function calling schema (JSON)

#### Optional Fields:
- **Config**: Type-specific configuration (JSON)
  - Only visible for non-built-in types
  - See configuration examples below

### 4. **Edit Tool**
Click "Edit" on any tool card to modify:
- Display name
- Description
- Category
- Type (can change)
- Configuration
- Schema
- Active status

**Note**: Tool name (ID) cannot be changed after creation.

### 5. **Delete Tool**
Click "Delete" to remove a tool.
- Confirmation dialog appears
- Cannot delete if agents are using the tool
- Error message shows how many agents are using it

## Configuration Examples

### Built-in Tool
No configuration needed.

```json
null
```

### MCP Local Tool
```json
{
  "serverPath": "/usr/local/bin/mcp-server",
  "args": ["--port", "8080"],
  "env": {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  }
}
```

### MCP Remote Tool
```json
{
  "endpoint": "https://mcp-server.example.com/api",
  "apiKey": "your-api-key",
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

## OpenAI Function Schema

All tools must provide an OpenAI-compatible function calling schema:

```json
{
  "type": "function",
  "function": {
    "name": "tool_name",
    "description": "What this tool does",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Description of param1"
        },
        "param2": {
          "type": "number",
          "description": "Description of param2"
        }
      },
      "required": ["param1"]
    }
  }
}
```

### Schema Fields:
- **type**: Always `"function"`
- **function.name**: Must match the tool name (ID)
- **function.description**: Clear description of what the tool does
- **function.parameters**: JSON Schema object defining parameters
  - **type**: Always `"object"`
  - **properties**: Object with parameter definitions
  - **required**: Array of required parameter names

## Creating a New Built-in Tool

### Step 1: Create Tool Implementation
Create the function in `lib/tools/built-in/your-tool.ts`:

```typescript
export async function yourTool(param1: string): Promise<any> {
  // Your implementation
  return { result: "success" }
}
```

### Step 2: Add to Executor
Update `lib/tools/executors/built-in-executor.ts`:

```typescript
case "your_tool":
  return await yourTool(params.param1)
```

### Step 3: Register in Registry
Update `lib/tools/registry.ts` to add the tool definition.

### Step 4: Create in UI
1. Navigate to `/tools`
2. Click "Create Tool"
3. Fill in the form:
   - **Name**: `your_tool`
   - **Display Name**: `Your Tool`
   - **Description**: `Description of what it does`
   - **Category**: `category`
   - **Type**: `built-in`
   - **Schema**: Paste the function schema
4. Click "Create Tool"

## Creating an MCP Tool

### MCP Remote Example
1. Navigate to `/tools`
2. Click "Create Tool"
3. Fill in the form:
   - **Name**: `remote_api_tool`
   - **Display Name**: `Remote API Tool`
   - **Description**: `Calls a remote MCP server`
   - **Category**: `api`
   - **Type**: `mcp-remote`
   - **Config**:
     ```json
     {
       "endpoint": "https://your-mcp-server.com/api",
       "apiKey": "your-api-key"
     }
     ```
   - **Schema**: Define the function schema
4. Click "Create Tool"

The tool will now be available in the agent wizard when creating/editing agents.

## Usage in Agents

After creating a tool:
1. Go to Agents → Create/Edit Agent
2. In the "Tools" step, select your tool
3. Test the agent with the tool enabled

## API Endpoints

### GET /api/tools
List all tools (optionally include inactive).

Query parameters:
- `includeInactive=true`: Include inactive tools

### POST /api/tools
Create a new tool.

Body:
```json
{
  "name": "tool_name",
  "displayName": "Tool Name",
  "description": "Description",
  "category": "category",
  "type": "built-in",
  "config": null,
  "schema": { /* OpenAI schema */ }
}
```

### GET /api/tools/:id
Get a specific tool with agent usage information.

### PATCH /api/tools/:id
Update a tool.

Body (all fields optional):
```json
{
  "displayName": "New Name",
  "description": "New description",
  "isActive": false
}
```

### DELETE /api/tools/:id
Delete a tool.

Fails if agents are using the tool.

## Tips

### JSON Validation
- Config and Schema fields are validated as JSON
- Use a JSON formatter/validator before pasting
- The UI will show an error if JSON is invalid

### Tool Names
- Use snake_case for tool names
- Keep names short and descriptive
- Cannot contain spaces or special characters

### Testing Tools
Run the test script to verify built-in tools work:
```bash
npx tsx lib/tools/test-tools.ts
```

### Inactive Tools
- Set `isActive: false` to temporarily disable a tool
- Inactive tools won't appear in agent tool selection
- Can be re-activated by editing and setting `isActive: true`

## Troubleshooting

### Cannot Delete Tool
**Error**: "Cannot delete tool: X agent(s) are using it"

**Solution**: Remove the tool from all agents first, then delete.

### Invalid JSON
**Error**: "Invalid JSON in config/schema field"

**Solution**:
1. Copy the JSON to a validator (jsonlint.com)
2. Fix syntax errors
3. Paste the corrected JSON back

### Tool Not Executing
1. Check if the tool type is implemented:
   - `built-in`: ✅ Fully implemented
   - `mcp-remote`: ✅ HTTP client ready
   - `mcp-local`: 🟡 Stub only
2. Check the tool is added to the registry
3. Check the schema matches the function signature
4. Test with the test script

## Future Enhancements
- [ ] Visual schema builder (no JSON editing needed)
- [ ] Tool testing directly from UI
- [ ] Tool usage analytics
- [ ] Tool templates/marketplace
- [ ] Import/export tools
- [ ] Versioning support
