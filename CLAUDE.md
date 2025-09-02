
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FlowFront - n8n Workflow to Form Generator

## Project Purpose
FlowFront converts n8n workflow JSON files into simple web forms. Users upload their n8n workflows and get a basic form interface that submits data to their webhook.

## Core Flow
1. User uploads n8n workflow JSON via dashboard
2. WorkflowAnalyzer parses workflow to find webhook nodes and extract form fields
3. Generates simple form with detected fields
4. Form submits to original n8n webhook URL

## Key Components
- **WorkflowAnalyzer** (`lib/workflow-analyzer.ts`): 
  - Finds webhook nodes in workflow
  - Extracts `{{variable}}` patterns from node parameters
  - Converts variables to typed form fields (text, email, textarea, number)
- **Form Generator** (`components/form-generator.tsx`): Renders forms from field definitions
- **Upload Dashboard** (`app/page.tsx`): JSON upload interface

## Field Detection Logic
1. Find webhook nodes in workflow
2. Scan all node parameters for `{{variable}}` patterns
3. Smart type detection:
   - Contains "email" → email field
   - Contains "message/description" → textarea
   - Contains "age/count/number" → number field
   - Default → text field

## Workflow Structure Expected
```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "parameters": { "path": "contact" }
    },
    {
      "type": "n8n-nodes-base.httpRequest", 
      "parameters": {
        "body": "Name: {{name}}, Email: {{email}}, Message: {{message}}"
      }
    }
  ]
}
```

## Tech Stack
- **Framework**: Next.js 15.5.2 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI Components**: Shadcn/ui
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Font**: Geist (sans and mono variants)

## Development Commands
- **Start development server**: `npm run dev` - Runs Next.js with Turbopack at http://localhost:3000
- **Build for production**: `npm run build` - Creates optimized production build
- **Start production server**: `npm run start` - Runs the production build
- **Database**: `npx prisma db push` - Push schema changes to database
- **Generate Prisma client**: `npx prisma generate` - Generate Prisma client

## Database Schema (Core Tables)
```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  apps      App[]
}

model App {
  id              String    @id @default(cuid())
  userId          String
  name            String
  webhookUrl      String
  formSchema      Json      // Form field definitions
  submissionCount Int       @default(0)
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id])
  submissions     FormSubmission[]
}

model FormSubmission {
  id             String   @id @default(cuid())
  appId          String
  submissionData Json     // Form data submitted
  submittedAt    DateTime @default(now())
  
  app            App      @relation(fields: [appId], references: [id])
}
```

## Directory Structure
```
app/
├── layout.tsx              # Root layout with Clerk provider
├── page.tsx                # Home/upload page
├── dashboard/              # User dashboard pages
├── form/[appId]/          # Generated form pages
├── api/
│   ├── apps/              # App CRUD operations
│   └── webhooks/          # Webhook handlers
components/
├── ui/                    # Shadcn components
├── form-generator.tsx     # Dynamic form renderer
├── workflow-upload.tsx    # JSON upload component
├── app-card.tsx          # Dashboard app cards
lib/
├── workflow-analyzer.ts   # Core n8n workflow parsing
├── prisma.ts             # Database client
├── supabase.ts           # Supabase client
├── clerk.ts              # Clerk configuration
├── utils.ts              # Utility functions
types/
├── workflow.ts           # n8n workflow types
├── form.ts              # Form field types
prisma/
├── schema.prisma         # Database schema
```

## Environment Variables Required
```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# Supabase
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Core Types
```typescript
// Workflow node structure
interface N8nWorkflowNode {
  type: string
  parameters?: Record<string, any>
  name?: string
}

// Form field definition
interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'textarea' | 'number' | 'select'
  required?: boolean
  options?: string[] // for select fields
}

// Generated app structure
interface GeneratedApp {
  id: string
  name: string
  webhookUrl: string
  formSchema: FormField[]
  submissionCount: number
}
```

## Key Features to Implement
1. **Workflow Upload** - JSON file upload with validation
2. **Field Extraction** - Parse `{{variables}}` from workflow nodes
3. **Form Generation** - Dynamic forms based on extracted fields
4. **Form Submission** - POST to original n8n webhook + save to database
5. **Dashboard** - List generated apps, view analytics
6. **Public Forms** - Shareable form URLs

## Development Priority
1. Basic workflow analyzer and field extraction
2. Simple form generator component
3. Upload interface and basic dashboard
4. Form submission handling
5. Authentication and user management
6. Analytics and app management features

## n8n Integration Notes
- Look for webhook nodes: `"type": "n8n-nodes-base.webhook"`
- Extract webhook path from parameters for URL construction
- Scan all node parameters (recursively) for `{{variable}}` patterns
- Common patterns: `{{$json.fieldName}}`, `{{name}}`, `{{email}}`
- Preserve original workflow structure, just extract form data

## Form Rendering Strategy
- Generate minimal, clean forms with Tailwind styling
- Use Shadcn components for consistent UI
- Support basic validation (required fields, email format)
- Submit to both n8n webhook AND internal database
- Show success/error states clearly

## Security Considerations
- Validate JSON uploads for malicious content
- Rate limit form submissions
- Sanitize extracted field names
- Validate webhook URLs before storing
- Use Clerk for secure authentication


## Project Overview

This is a Next.js 15 application using the App Router, TypeScript, and Tailwind CSS v4. The project uses Turbopack for faster development builds and includes shadcn/ui component setup.

## Tech Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with CSS variables
- **Component Library**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **Build Tool**: Turbopack

## Common Commands

```bash
# Development
npm run dev         # Start development server with Turbopack

# Production
npm run build       # Build for production with Turbopack
npm run start       # Start production server

# Code Quality
npm run lint        # Run ESLint
```

## Project Structure

- `/app` - Next.js App Router pages and layouts
- `/components` - React components (organized with `/ui` for shadcn components)
- `/lib` - Utility functions and shared code
- `/public` - Static assets

## Key Configuration

- **shadcn/ui Aliases**:
  - `@/components` - Component directory
  - `@/components/ui` - UI components
  - `@/lib` - Library utilities
  - `@/lib/utils` - Utility functions (includes `cn()` for className merging)
  - `@/hooks` - Custom React hooks

## Development Notes

- The project uses Tailwind CSS v4 with CSS variables for theming
- shadcn/ui components are configured with the New York style and use Lucide icons
- The `cn()` utility function in `/lib/utils.ts` combines clsx and tailwind-merge for className management
- Global styles are in `/app/globals.css`