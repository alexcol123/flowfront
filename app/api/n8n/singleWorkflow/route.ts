import { NextRequest, NextResponse } from "next/server";

interface N8nNode {
  type: string;
  parameters?: Record<string, any>;
  name?: string;
  // other node properties as needed
}

interface N8nConnection {
  [key: string]: any;
}

interface SingleWorkflow {
  id: string;
  name: string;
  isArchived: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: N8nNode[];
  connections: N8nConnection;
  settings?: Record<string, any>;
  staticData?: any;
  meta?: any;
  pinData?: Record<string, any>;
  versionId: string;
  triggerCount: number;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { instanceUrl, apiKey, workflowName } = await request.json();

    console.log('Fetching single workflow:', workflowName);

    if (!instanceUrl || !apiKey || !workflowName) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Instance URL, API Key, and workflow name are required" 
        },
        { status: 400 }
      );
    }

    // First, get all workflows to find the ID of the workflow by name
    const listUrl = new URL(`${instanceUrl}/api/v1/workflows`);
    listUrl.searchParams.append("limit", "100");
    listUrl.searchParams.append("active", "false");

    console.log('Finding workflow by name:', workflowName);

    const listResponse = await fetch(listUrl.toString(), {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Error fetching workflows list:", errorText);
      
      if (listResponse.status === 401 || listResponse.status === 403) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid API key or insufficient permissions",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch workflows: ${listResponse.statusText}` 
        },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const workflows = listData.data || [];
    
    // Find the workflow by name
    const targetWorkflow = workflows.find(
      (wf: SingleWorkflow) => wf.name === workflowName
    );

    if (!targetWorkflow) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Workflow "${workflowName}" not found` 
        },
        { status: 404 }
      );
    }

    // Now fetch the specific workflow by ID to get full details
    const workflowUrl = `${instanceUrl}/api/v1/workflows/${targetWorkflow.id}`;
    
    console.log('Fetching workflow details from:', workflowUrl);

    const workflowResponse = await fetch(workflowUrl, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error("Error fetching single workflow:", errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch workflow details: ${workflowResponse.statusText}` 
        },
        { status: workflowResponse.status }
      );
    }

    const workflowData = await workflowResponse.json();
    console.log('Single workflow data retrieved:', workflowData.name);

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflowData.id,
        name: workflowData.name,
        active: workflowData.active,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings,
        createdAt: workflowData.createdAt,
        updatedAt: workflowData.updatedAt,
        versionId: workflowData.versionId,
      },
    });
  } catch (error) {
    console.error("Single workflow fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch single workflow",
      },
      { status: 500 }
    );
  }
}