-- Create playground_settings table
CREATE TABLE IF NOT EXISTS "playground_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "defaultModelId" TEXT,
    "availableModelIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playground_settings_pkey" PRIMARY KEY ("id")
);

-- Create unique index on organizationId
CREATE UNIQUE INDEX IF NOT EXISTS "playground_settings_organizationId_key" ON "playground_settings"("organizationId");

-- Add foreign key constraint
ALTER TABLE "playground_settings" ADD CONSTRAINT "playground_settings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
