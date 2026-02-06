# Tools System

The Lucas.ai tools system supports multiple tool types with extensible execution strategies.

## Tool Types

### 1. Built-in Tools (`built-in`)
Tools that execute code directly within the application.

**Current built-in tools:**
- **calculator**: Evaluate mathematical expressions
  - Supports: `+`, `-`, `*`, `/`, `^`, `sqrt()`, `sin()`, `cos()`, `tan()`, `log()`, `ln()`, `abs()`, `ceil()`, `floor()`, `round()`, `pi`, `e`
  - Example: `"sqrt(16)"`, `"2^10"`, `"sin(pi/2)"`

- **get_current_datetime**: Get current date and time
  - Optional timezone parameter
  - Example: `{ timezone: "America/New_York" }`

- **web_search**: Search the web (requires TAVILY_API_KEY)
  - Returns top search results
  - Example: `{ query: "latest AI news" }`

### 2. MCP Local Tools (`mcp-local`)
Tools that connect to local Model Context Protocol (MCP) servers running on the same machine.

**Configuration:**
```json
{
  "serverPath": "/path/to/mcp-server",
  "args": ["--port", "8080"],
  "env": {
    "API_KEY": "your-key"
  }
}
```

**Status:** Stub implementation (to be completed)

### 3. MCP Remote Tools (`mcp-remote`)
Tools that connect to remote MCP servers via HTTP/WebSocket.

**Configuration:**
```json
{
  "endpoint": "https://mcp-server.example.com",
  "apiKey": "your-api-key",
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

**Status:** Basic HTTP implementation complete

### 4. Custom Tools (`custom`)
Organization-specific tools (future expansion).

## Architecture

### Core Components

```
lib/tools/
├── types.ts                 # Type definitions
├── registry.ts              # Tool registry and execution router
├── built-in/                # Built-in tool implementations
│   ├── calculator.ts
│   ├── datetime.ts
│   └── web-search.ts
├── executors/               # Tool type executors
│   ├── built-in-executor.ts
│   ├── mcp-local-executor.ts
│   └── mcp-remote-executor.ts
└── test-tools.ts           # Test script
```

### Execution Flow

1. Agent receives tool call from LLM
2. `agent-executor.ts` calls `executeTool(name, params, type, config)`
3. `registry.ts` routes to appropriate executor based on type
4. Executor runs the tool and returns result
5. Result is passed back to LLM for final response

## Database Schema

```prisma
model BuiltInTool {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  description String
  category    String
  type        String   @default("built-in")  // built-in, mcp-local, mcp-remote
  config      Json?    // Type-specific configuration
  schema      Json     // OpenAI function schema
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model AgentTool {
  id            String   @id @default(cuid())
  agentId       String
  builtInToolId String?
  customToolId  String?
  config        Json?    // Override tool-specific config
  createdAt     DateTime @default(now())
}
```

## Adding New Built-in Tools

1. **Create tool implementation** in `lib/tools/built-in/your-tool.ts`:
```typescript
export async function yourTool(params: { param1: string }): Promise<any> {
  // Implementation
  return { result: "success" }
}
```

2. **Add to built-in executor** in `executors/built-in-executor.ts`:
```typescript
case "your_tool":
  return await yourTool(params.param1)
```

3. **Register in registry** in `registry.ts`:
```typescript
your_tool: {
  name: "your_tool",
  displayName: "Your Tool",
  description: "Description",
  type: "built-in",
  schema: {
    type: "function",
    function: {
      name: "your_tool",
      description: "Description",
      parameters: {
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "Parameter description"
          }
        },
        required: ["param1"]
      }
    }
  },
  execute: async (params) => {
    const executor = new BuiltInToolExecutor("your_tool")
    return await executor.execute(params)
  }
}
```

4. **Seed the database** in `prisma/seed.ts`:
```typescript
{
  name: 'your_tool',
  displayName: 'Your Tool',
  description: 'Description',
  category: 'category',
  type: 'built-in',
  config: null,
  schema: { /* same as registry */ }
}
```

5. **Run seed script**:
```bash
npx tsx prisma/seed.ts
```

## Testing Tools

Run the test script to verify tools work:
```bash
npx tsx lib/tools/test-tools.ts
```

## Environment Variables

- `TAVILY_API_KEY`: Required for web_search tool

## Future Enhancements

- [ ] Complete MCP local server management (start/stop processes)
- [ ] WebSocket support for MCP remote tools
- [ ] Tool result caching
- [ ] Tool usage analytics
- [ ] Tool rate limiting
- [ ] Custom tool builder UI
- [ ] Tool marketplace
