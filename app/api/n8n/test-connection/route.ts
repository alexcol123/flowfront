import { NextRequest, NextResponse } from 'next/server'

interface N8nWorkflow {
  id: string
  name: string
  isArchived: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { instanceUrl, apiKey } = await request.json()

    console.log(instanceUrl)

    if (!instanceUrl || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Instance URL and API Key are required' },
        { status: 400 }
      )
    }

    // Build URL with query parameters as per n8n API docs
    const url = new URL(`${instanceUrl}/api/v1/workflows`)
    url.searchParams.append('limit', '10') // Get up to 100 workflows
    url.searchParams.append('active', 'false') // Include inactive workflows
    
    console.log('Fetching workflows from:', url.toString())

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey, // n8n uses X-N8N-API-KEY header
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Invalid API key or insufficient permissions' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { success: false, error: `Connection failed: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Workflows data:', data)
    
    // n8n API returns data in { data: [...], nextCursor?: string } format
    const workflows = data.data || []
    const workflowCount = workflows.length
    const notArchivedWorkflows = workflows.filter((wf: N8nWorkflow) => wf.isArchived !== true)
 const archivedWorkflows = workflows.filter((wf: N8nWorkflow) => wf.isArchived !== false)
    console.log(`Fetched ${workflowCount} workflows, ${notArchivedWorkflows.length} are not archived.`) 
    console.log(`Fetched ${workflowCount} workflows, ${archivedWorkflows.length} are archived.`)

    // Extract just the workflow names
    const workflowNames = workflows.map((wf: N8nWorkflow) => wf.name)

    return NextResponse.json({
      success: true,
      workflowCount,
      workflowNames,
      hasMore: !!data.nextCursor,
    })
  } catch (error) {
    console.error('N8N connection test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to n8n instance' 
      },
      { status: 500 }
    )
  }
}