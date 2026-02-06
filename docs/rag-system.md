# RAG (Retrieval Augmented Generation) System

## Overview
Lucas.ai includes a comprehensive, extensible RAG system for document upload, processing, and retrieval. The system is built with a strategy pattern approach for maximum flexibility and future optimization.

## Architecture

### Core Components

```
lib/data-sources/
├── types.ts                      # Type definitions
├── storage/
│   └── local-storage.ts          # Local file storage service
├── processors/
│   ├── text-processor.ts         # TXT/MD processor
│   ├── pdf-processor.ts          # PDF processor
│   ├── docx-processor.ts         # DOCX processor
│   └── registry.ts               # Processor registry
├── chunking/
│   ├── fixed-size.ts             # Fixed-size chunking
│   ├── sentence.ts               # Sentence-based chunking
│   ├── recursive.ts              # Recursive chunking
│   └── registry.ts               # Chunking registry
├── embeddings/
│   ├── openai-embeddings.ts      # OpenAI embeddings provider
│   └── registry.ts               # Embedding registry
├── pipeline.ts                   # Data processing pipeline
└── retrieval.ts                  # Vector search functions
```

## Features

### 1. File Storage (Local)
- **Local filesystem** storage (no cloud dependency)
- Files stored in `uploads/` directory
- Random UUID naming for uniqueness
- Support for large files (up to 50MB)
- Automatic cleanup on deletion

### 2. Document Processing
Extensible processor registry supports:
- **PDF** (.pdf) - using pdf-parse
- **DOCX** (.docx) - using mammoth
- **Text** (.txt, .md) - native support

**Adding new processors:**
```typescript
class MyProcessor implements DocumentProcessor {
  async extractText(filePath: string): Promise<string> {
    // Implementation
  }

  getSupportedTypes(): FileType[] {
    return ["mytype"]
  }
}

// Register
processorRegistry.registerProcessor(new MyProcessor())
```

### 3. Chunking Strategies
Three built-in strategies:

#### Fixed-Size Chunking
- Splits text into fixed-size chunks
- Configurable overlap
- Best for: General purpose, consistent chunk sizes

#### Sentence Chunking
- Splits by sentences, groups to target size
- Preserves sentence boundaries
- Best for: Content where sentence integrity matters

#### Recursive Chunking
- Hierarchical splitting: paragraphs → sentences → words
- Maintains natural structure
- Best for: Documents with clear structure

**Configuration:**
```json
{
  "chunkingStrategy": "fixed-size",
  "chunkSize": 1000,
  "chunkOverlap": 200
}
```

**Adding new strategies:**
```typescript
class MyChunking implements ChunkingStrategyInterface {
  chunk(text: string, options: { chunkSize: number; chunkOverlap: number }): string[] {
    // Implementation
  }
}

// Register
chunkingRegistry.registerStrategy("my-strategy", new MyChunking())
```

### 4. Embedding Generation
Extensible embedding registry supports:
- **OpenAI text-embedding-3-small** (1536 dimensions)
- **OpenAI text-embedding-3-large** (3072 dimensions)

**Features:**
- Batch embedding generation (100 per batch)
- Automatic batching for large documents
- Error handling and retries

**Adding new providers:**
```typescript
class MyEmbeddings implements EmbeddingProvider {
  async generateEmbedding(text: string): Promise<number[]> {
    // Implementation
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    // Implementation
  }

  getDimensions(): number { return 1536 }
  getModelName(): string { return "my-model" }
}

// Register
embeddingRegistry.registerProvider("my-model", () => new MyEmbeddings())
```

### 5. Vector Search
Uses PostgreSQL with pgvector extension:
- **Cosine similarity** search
- Configurable top-k results
- Similarity threshold filtering
- Source attribution in results

**Search Options:**
```typescript
{
  dataSourceIds: string[]      // Data sources to search
  topK: number                  // Number of results (default: 5)
  threshold: number             // Min similarity (default: 0.7)
  embeddingModel: string        // Model used for query
}
```

## Processing Pipeline

### End-to-End Flow

1. **Upload**
   - User uploads file via UI
   - File saved to local storage
   - DataSource record created with status="pending"

2. **Text Extraction**
   - Appropriate processor selected based on file type
   - Text extracted from document
   - Error handling for corrupt files

3. **Chunking**
   - Text split using selected strategy
   - Configurable size and overlap
   - Chunks numbered by position

4. **Embedding Generation**
   - Batch embedding generation
   - Chunks processed in batches of 100
   - Embeddings stored as pgvector

5. **Storage**
   - Chunks saved to database
   - Embeddings indexed for fast search
   - DataSource status updated to "indexed"

6. **Retrieval**
   - Query embedded using same model
   - Vector similarity search
   - Results ranked by similarity
   - Context returned to agent

## API Endpoints

### Upload Document
```http
POST /api/data-sources
Content-Type: multipart/form-data

file: <file>
name: "Document Name"
description: "Optional description"
chunkingStrategy: "fixed-size"
chunkSize: 1000
chunkOverlap: 200
indexingStrategy: "vector"
embeddingModel: "text-embedding-3-small"
```

### List Data Sources
```http
GET /api/data-sources?status=indexed
```

### Get Data Source
```http
GET /api/data-sources/:id
```

Returns data source with:
- Metadata
- Processing status
- Sample chunks (first 10)
- Agents using it

### Process Data Source
```http
POST /api/data-sources/:id/process
```

Triggers processing pipeline for pending/failed sources.

### Search Data Source
```http
POST /api/data-sources/:id/search
Content-Type: application/json

{
  "query": "search query",
  "topK": 5,
  "threshold": 0.7
}
```

Returns matching chunks with similarity scores.

### Delete Data Source
```http
DELETE /api/data-sources/:id
```

Deletes data source, chunks, and local file. Fails if agents are using it.

## UI Features

### Data Sources Page
Located at `/data-sources`

**Features:**
- Grid view of all data sources
- Status badges (pending, processing, indexed, failed)
- Real-time updates (polls every 5 seconds)
- Upload dialog with configuration
- Delete with protection
- Re-process failed sources

**Status Colors:**
- 🟤 **Pending**: Gray - waiting to be processed
- 🔵 **Processing**: Blue - currently processing (animated spinner)
- 🟢 **Indexed**: Green - ready to use
- 🔴 **Failed**: Red - processing error

### Upload Dialog
**Fields:**
- **Name**: Display name for data source
- **Description**: Optional description
- **File**: PDF, DOCX, TXT, or MD (max 50MB)
- **Chunking Strategy**: Fixed-size, Sentence, or Recursive
- **Chunk Size**: Characters per chunk (default: 1000)
- **Chunk Overlap**: Overlap between chunks (default: 200)
- **Embedding Model**: OpenAI small or large

## Integration with Agents

Data sources can be attached to agents:

```typescript
// In agent creation/editing
const agent = await prisma.agent.create({
  data: {
    // ... agent fields
    dataSources: {
      create: [
        {
          dataSourceId: "ds-id",
          topK: 5,
          similarityThreshold: 0.7
        }
      ]
    }
  }
})
```

During agent execution, relevant chunks are retrieved and added to the context:

```typescript
const chunks = await vectorSearch(userMessage, {
  dataSourceIds: agent.dataSources.map(ds => ds.dataSourceId),
  topK: 5,
  threshold: 0.7
})

const context = chunks.map(c => c.content).join("\n\n")
const systemPrompt = agent.systemPrompt + "\n\nContext:\n" + context
```

## Database Schema

### DataSource Table
```sql
CREATE TABLE data_sources (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,           -- file, web, api, text
  file_type TEXT,               -- pdf, docx, txt, md
  file_path TEXT,               -- Local file path
  file_size INTEGER,
  status TEXT NOT NULL,         -- pending, processing, indexed, failed
  chunking_strategy TEXT,       -- fixed-size, sentence, recursive
  chunk_size INTEGER,
  chunk_overlap INTEGER,
  indexing_strategy TEXT,       -- vector, bm25, hybrid
  embedding_model TEXT,
  total_chunks INTEGER,
  error_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Chunk Table
```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  data_source_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),       -- pgvector type
  metadata JSONB,
  position INTEGER,             -- Position in document
  created_at TIMESTAMP,

  FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
)

-- Index for fast vector search
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Performance Considerations

### Chunking
- **Fixed-size**: Fastest, constant time
- **Sentence**: Medium speed, depends on sentence count
- **Recursive**: Slowest, multiple passes

### Embedding Generation
- Batched in groups of 100
- Parallel requests to OpenAI
- Rate limiting built-in
- ~1-2 seconds per 100 chunks

### Vector Search
- Indexed with ivfflat
- Sub-100ms for most queries
- Scales to millions of chunks

## Future Optimizations

### Planned Enhancements
1. **Job Queue**: Use BullMQ for background processing
2. **Caching**: Cache frequent queries
3. **Hybrid Search**: Combine vector + BM25
4. **Reranking**: Add reranking step for better results
5. **Streaming**: Stream chunks as they're processed
6. **Multi-modal**: Support images, audio, video
7. **OCR**: Extract text from images in PDFs
8. **Web Scraping**: Add web data source type
9. **API Integration**: Connect to external APIs
10. **Incremental Updates**: Update existing sources

### Extensibility Points
All components use registries for easy extension:
- ✅ Document processors
- ✅ Chunking strategies
- ✅ Embedding providers
- ⏳ Indexing strategies (vector only for now)
- ⏳ Retrieval methods (vector only for now)

## Testing

### Manual Testing
1. **Upload a document**
   - Navigate to `/data-sources`
   - Click "Upload Document"
   - Select a PDF, DOCX, or TXT file
   - Configure chunking and embedding
   - Click "Upload"

2. **Verify processing**
   - Status changes to "Processing"
   - Spinner animates
   - Status changes to "Indexed" when complete
   - Chunk count updated

3. **Test retrieval**
   - Click "View" on indexed source
   - Use search interface
   - Verify relevant results returned

### Programmatic Testing
```typescript
// Test document processing
const result = await dataSourcePipeline.process(
  dataSourceId,
  filePath,
  "pdf",
  {
    chunkingStrategy: "fixed-size",
    chunkSize: 1000,
    chunkOverlap: 200,
    indexingStrategy: "vector",
    embeddingModel: "text-embedding-3-small"
  }
)

// Test vector search
const chunks = await vectorSearch("test query", {
  dataSourceIds: [dataSourceId],
  topK: 5,
  threshold: 0.7
})
```

## Environment Variables

Required:
```env
OPENAI_API_KEY=sk-...           # For embeddings
DATABASE_URL=postgresql://...   # PostgreSQL with pgvector
UPLOAD_DIR=./uploads            # Optional, defaults to ./uploads
```

## Troubleshooting

### Processing Stuck
- Check OPENAI_API_KEY is set
- Verify file isn't corrupted
- Check database connection
- Review error message in UI

### No Results in Search
- Verify data source is "indexed"
- Check embedding model matches
- Lower similarity threshold
- Increase top-k value

### Slow Processing
- Large files take longer
- Embedding generation is rate-limited
- Consider using smaller chunk sizes
- Batch processing is automatic

## Summary

The RAG system provides a production-ready foundation for document processing and retrieval. Key strengths:

✅ **Extensible**: Easy to add processors, chunkers, embedders
✅ **Performant**: Efficient batch processing and vector search
✅ **Reliable**: Error handling and status tracking
✅ **User-Friendly**: Visual UI with real-time updates
✅ **Scalable**: Local storage for MVP, ready for cloud
✅ **Type-Safe**: Full TypeScript support

The strategy pattern architecture ensures easy optimization and extension as requirements evolve.
