import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ==================================================
    // STEP 1: PARSE AND VALIDATE REQUEST DATA
    // ==================================================
    const contentType = request.headers.get("content-type") || "";
    let requestData: any;

    if (contentType.includes("application/json")) {
      requestData = await request.json();
    } else {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Validate required fields
    const { webhookUrl, message, sessionId } = requestData;

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return NextResponse.json(
        { error: "webhookUrl is required and must be a string" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch (error) {
      return NextResponse.json(
        { error: "webhookUrl must be a valid URL" },
        { status: 400 }
      );
    }

    // ==================================================
    // STEP 2: PREPARE DATA FOR N8N WEBHOOK
    // ==================================================
    const startTime = Date.now();
    
    const webhookPayload = {
      message: message.trim(),
      timestamp: new Date().toISOString(),
      ...(sessionId && { sessionId })
    };

    // ==================================================
    // STEP 3: SEND REQUEST TO N8N WEBHOOK
    // ==================================================
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FlowFront-ChatWebhook/1.0"
      },
      body: JSON.stringify(webhookPayload),
    });

    const processingTime = Date.now() - startTime;

    // Check if the n8n webhook responded successfully
    if (!webhookResponse.ok) {
      return NextResponse.json(
        { 
          success: false,
          error: `n8n webhook returned error: ${webhookResponse.status} ${webhookResponse.statusText}`,
          metadata: {
            processingTime: `${processingTime}ms`,
            webhookStatus: webhookResponse.status
          }
        },
        { status: 500 }
      );
    }

    // ==================================================
    // STEP 4: PROCESS N8N RESPONSE
    // ==================================================
    let n8nResult: any;
    const responseContentType = webhookResponse.headers.get("content-type") || "";

    try {
      if (responseContentType.includes("application/json")) {
        n8nResult = await webhookResponse.json();
      } else {
        // Handle non-JSON responses (plain text, etc.)
        const responseText = await webhookResponse.text();
        n8nResult = { response: responseText };
      }
    } catch (parseError) {
      // Fallback if response parsing fails
      const responseText = await webhookResponse.text();
      n8nResult = { response: responseText };
    }

    // ==================================================
    // STEP 5: EXTRACT CHAT RESPONSE
    // ==================================================
    let chatResponse: string;

    // Try different common response formats from n8n
    if (typeof n8nResult === "string") {
      // Direct string response
      chatResponse = n8nResult;
    } else if (n8nResult.response && typeof n8nResult.response === "string") {
      // Response wrapped in object
      chatResponse = n8nResult.response;
    } else if (n8nResult.message && typeof n8nResult.message === "string") {
      // Message field
      chatResponse = n8nResult.message;
    } else if (n8nResult.text && typeof n8nResult.text === "string") {
      // Text field
      chatResponse = n8nResult.text;
    } else if (n8nResult.output && typeof n8nResult.output === "string") {
      // Output field
      chatResponse = n8nResult.output;
    } else {
      // Fallback: stringify the entire response
      chatResponse = JSON.stringify(n8nResult);
    }

    // ==================================================
    // STEP 6: RETURN STANDARDIZED RESPONSE
    // ==================================================
    return NextResponse.json({
      success: true,
      response: chatResponse.trim(),
      metadata: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        webhookStatus: webhookResponse.status,
        ...(n8nResult.model && { model: n8nResult.model }),
        ...(n8nResult.cost && { cost: n8nResult.cost }),
      },
      // Include raw n8n response for debugging if needed
      rawResponse: n8nResult
    });

  } catch (error) {
    // ==================================================
    // GLOBAL ERROR HANDLER
    // ==================================================
    console.error("💥 Chat Webhook API Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// ==================================================
// HANDLE CORS PREFLIGHT REQUESTS
// ==================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}