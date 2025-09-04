import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get FormData instead of JSON (following reference pattern)
    const formData = await request.formData();
    
    // Extract webhook URL and workflow name from FormData
    const webhookUrl = formData.get("webhookUrl") as string;
    const workflowName = formData.get("workflowName") as string;

    // Validate required fields
    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook URL format" },
        { status: 400 }
      );
    }

    console.log("Submitting FormData to n8n webhook:", {
      webhookUrl,
      workflowName,
    });

    // Create new FormData for n8n (removing our internal fields)
    const n8nFormData = new FormData();
    
    // Copy all fields except our internal ones
    for (const [key, value] of formData.entries()) {
      if (key !== "webhookUrl" && key !== "workflowName") {
        n8nFormData.append(key, value);
        console.log(`Adding to n8n FormData: ${key} = ${value instanceof File ? `[File: ${value.name}]` : value}`);
      }
    }

    // Submit FormData to n8n webhook (following reference pattern)
    const response = await fetch(webhookUrl, {
      method: "POST",
      body: n8nFormData,
      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    });

    // Get response text first to handle both JSON and plain text responses
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If response is not JSON, treat it as plain text
      responseData = { message: responseText };
    }

    console.log("n8n webhook response:", {
      status: response.status,
      data: responseData,
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Webhook returned error: ${response.status}`,
          details: responseData 
        },
        { status: response.status }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Form submitted successfully to n8n workflow",
      workflowResponse: responseData,
      metadata: {
        workflowName,
        submittedAt: new Date().toISOString(),
        fieldsSubmitted: Object.keys(formData).length,
      },
    });

  } catch (error) {
    console.error("Form submission error:", error);
    
    // Handle network errors
    if (error instanceof Error && error.message.includes("fetch")) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to connect to webhook URL. Please check if the URL is correct and accessible." 
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit form to n8n workflow",
      },
      { status: 500 }
    );
  }
}