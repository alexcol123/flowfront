import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { instanceUrl, apiKey, workflowData } = await request.json();

    // Validate required fields
    if (!instanceUrl) {
      return NextResponse.json(
        { success: false, error: "Instance URL is required" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API Key is required" },
        { status: 400 }
      );
    }

    if (!workflowData || typeof workflowData !== "object") {
      return NextResponse.json(
        { success: false, error: "Workflow data is required" },
        { status: 400 }
      );
    }

    // Validate workflow data structure
    if (!workflowData.name) {
      return NextResponse.json(
        { success: false, error: "Workflow name is required" },
        { status: 400 }
      );
    }

    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      return NextResponse.json(
        { success: false, error: "Workflow nodes array is required" },
        { status: 400 }
      );
    }

    // Validate instance URL format
    try {
      new URL(instanceUrl);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid instance URL format" },
        { status: 400 }
      );
    }

    console.log("Creating workflow in n8n instance:", {
      instanceUrl,
      workflowName: workflowData.name,
      nodeCount: workflowData.nodes.length,
    });

    // Filter out properties that n8n doesn't expect when creating workflows
    const cleanWorkflowData = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections || {},
      settings: workflowData.settings || {},
      // active: workflowData.active || false,
      // tags: workflowData.tags || []
    };

    console.log("Sending clean workflow data:", cleanWorkflowData);

    // Create workflow in n8n instance
    const url = `${instanceUrl}/api/v1/workflows`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanWorkflowData),
    });

    console.log("n8n create workflow response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from n8n:", errorText);

      if (response.status === 401 || response.status === 403) {
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
          error: `Failed to create workflow: ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const createdWorkflow = await response.json();
    console.log("Successfully created workflow:", createdWorkflow);

    return NextResponse.json({
      success: true,
      message: "Workflow created successfully",
      workflow: createdWorkflow,
    });

  } catch (error) {
    console.error("Create workflow error:", error);
    
    // Handle network errors
    if (error instanceof Error && error.message.includes("fetch")) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to connect to n8n instance. Please check if the URL is correct and accessible." 
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create workflow",
      },
      { status: 500 }
    );
  }
}