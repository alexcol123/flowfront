"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WorkflowData,
  N8nNode,
  extractTriggerNodes,
} from "@/lib/workflow-utils";
import CreateWorkflowComponent from "@/components/create-workflow";

export default function WorkflowChatPage() {
  const params = useParams();
  const workflowName = decodeURIComponent(params.workflowName as string);
  const dateNow = new Date().toISOString().replace("T", "-time-");

  const EditedWorkflowName =
    workflowName + "-FLOW-FRONT-CHAT" + "-date-" + dateNow;
  const FinalWorkflowName = EditedWorkflowName + "-FINAL";
  
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [triggerNodes, setTriggerNodes] = useState<N8nNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showCredentials, setShowCredentials] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isUploadingFinal, setIsUploadingFinal] = useState(false);
  const [uploadFinalResult, setUploadFinalResult] = useState<{
    success: boolean;
    message: string;
    workflow?: any;
  } | null>(null);

  // Extract chat data from trigger nodes
  const extractedChatData = extractChatData(triggerNodes, workflowData || undefined);
  console.log("extracted chat data", extractedChatData);

  const fetchWorkflow = useCallback(async () => {
    if (!instanceUrl || !apiKey) {
      setError("Please provide instance URL and API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/n8n/singleWorkflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceUrl,
          apiKey,
          workflowName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWorkflowData(data.workflow);
        const triggers = extractTriggerNodes(data.workflow);
        setTriggerNodes(triggers);
        setShowCredentials(false);
      } else {
        setError(data.error || "Failed to fetch workflow");
      }
    } catch (fetchError) {
      console.error("Fetch workflow error:", fetchError);
      setError("An error occurred while fetching the workflow");
    } finally {
      setIsLoading(false);
    }
  }, [instanceUrl, apiKey, workflowName]);

  // Try to get credentials from localStorage on mount
  useEffect(() => {
    const savedInstanceUrl = localStorage.getItem("n8n-instance-url");
    const savedApiKey = localStorage.getItem("n8n-api-key");

    if (savedInstanceUrl && savedApiKey) {
      setInstanceUrl(savedInstanceUrl);
      setApiKey(savedApiKey);
      setShowCredentials(false);
    }
  }, []);

  // Auto-fetch when credentials are loaded
  useEffect(() => {
    if (instanceUrl && apiKey && !showCredentials) {
      fetchWorkflow();
    }
  }, [instanceUrl, apiKey, showCredentials, fetchWorkflow]);

  const handleCredentialsSubmit = () => {
    localStorage.setItem("n8n-instance-url", instanceUrl);
    localStorage.setItem("n8n-api-key", apiKey);
    fetchWorkflow();
  };


  // Handle chat message submission
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !webhookUrl) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/n8n/chat-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl,
          message: userMessage,
          sessionId: `chat-${workflowName}-${Date.now()}`, // Optional session ID
        }),
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        
        // Log processing time for debugging
        if (data.metadata?.processingTime) {
          console.log(`Chat response received in ${data.metadata.processingTime}`);
        }
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.error || "Failed to get response. Please check your webhook URL and try again." 
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Error connecting to the webhook. Please check your connection and try again." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Chat Interface</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate chat interface for your n8n workflow
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Chat Workflow: {workflowName}</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">
              Setting up chat interface for workflow: <strong>{workflowName}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Credentials Form */}
        {showCredentials && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Enter n8n Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Instance URL
                </label>
                <Input
                  type="url"
                  placeholder="https://your-instance.n8n.cloud"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  API Key
                </label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCredentialsSubmit}
                disabled={!instanceUrl || !apiKey || isLoading}
                className="w-full"
              >
                {isLoading ? "Loading..." : "Fetch Workflow"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">Error: {error}</p>
            <Button
              onClick={() => setShowCredentials(true)}
              className="mt-2"
              variant="outline"
            >
              Update Credentials
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading workflow data...</p>
          </div>
        )}

        <h2 className="text-xl font-semibold">Step 2: Full workflow</h2>

        {/* Show message if no trigger nodes found */}
        {workflowData && triggerNodes.length === 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Trigger Nodes</CardTitle>
              <p className="text-sm text-gray-500">
                No chat trigger nodes found in this workflow
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-4">
                This workflow doesn&apos;t contain any chat trigger nodes.
                <br />
                <span className="text-sm text-gray-500">
                  Supported triggers: @n8n/n8n-nodes-langchain.chatTrigger
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Workflow JSON Display */}
        {workflowData && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Complete Workflow JSON Data</CardTitle>
              <p className="text-sm text-gray-500">
                Full workflow data from n8n API
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(workflowData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transformed Workflow with Webhook */}
        {workflowData && triggerNodes.length > 0 && (
          <Card className="w-full border-blue-500">
            <CardHeader>
              <CardTitle>🔄 Transformed Workflow (Chat → Webhook)</CardTitle>
              <p className="text-sm text-gray-500">
                This workflow has been transformed to use a webhook trigger
                instead of a chat trigger. All message references have been
                updated to use webhook body format.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // Generate unique IDs for the new webhook node
                const generateId = () => {
                  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    return crypto.randomUUID();
                  }
                  // Fallback for environments without crypto.randomUUID
                  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                  });
                };
                const webhookId = generateId();
                const webhookNodeId = generateId();

                // Create the webhook trigger node
                const webhookNode = {
                  parameters: {
                    httpMethod: "POST",
                    path: webhookId,
                    responseMode: "responseNode", // Wait for response from "Respond to Webhook" node
                    options: {},
                  },
                  type: "n8n-nodes-base.webhook",
                  typeVersion: 2.1,
                  position: [0, 0], // Will be updated based on chat trigger position
                  id: webhookNodeId,
                  name: "Webhook",
                  webhookId: webhookId,
                };

                // Transform the workflow
                const transformedWorkflow = (() => {
                  const workflow = JSON.parse(JSON.stringify(workflowData)); // Deep clone

                  // Find the chat trigger node
                  const chatTriggerIndex = workflow.nodes?.findIndex(
                    (node: any) => node.type === "@n8n/n8n-nodes-langchain.chatTrigger"
                  );

                  if (chatTriggerIndex !== -1 && workflow.nodes) {
                    const chatTrigger = workflow.nodes[chatTriggerIndex];

                    // Use the chat trigger's position for the webhook
                    webhookNode.position = chatTrigger.position || [0, 0];

                    // Replace chat trigger with webhook
                    workflow.nodes[chatTriggerIndex] = webhookNode;

                    // Update connections - replace chat trigger name with webhook name
                    if (
                      workflow.connections &&
                      workflow.connections[chatTrigger.name]
                    ) {
                      workflow.connections["Webhook"] =
                        workflow.connections[chatTrigger.name];
                      delete workflow.connections[chatTrigger.name];
                    }

                    // Transform all other nodes to update data references
                    workflow.nodes = workflow.nodes.map((node: any) => {
                      if (node.id === webhookNodeId) return node; // Skip the webhook node itself

                      // Special handling for AI Agent nodes
                      if (node.type === "@n8n/n8n-nodes-langchain.agent") {
                        return {
                          ...node,
                          parameters: {
                            ...node.parameters,
                            promptType: "define",
                            text: "={{ $json.body.message }}",
                            options: {
                              ...node.parameters?.options,
                              systemMessage: "You are a helpful assistant"
                            }
                          }
                        };
                      }

                      // Deep transform all parameters to update variable references
                      const transformParameters = (obj: any): any => {
                        if (typeof obj === "string") {
                          // Transform message references from chat format to webhook format
                          let transformed = obj;

                          // Get the original chat trigger node name for complex patterns
                          const chatTriggerNodeName =
                            chatTrigger.name || "When chat message received";

                          // Step 1: Replace ALL references to the original chat node with 'Webhook'
                          const escapedNodeName = chatTriggerNodeName.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                          );
                          transformed = transformed.replace(
                            new RegExp(`\\$\\('${escapedNodeName}'\\)`, "g"),
                            `$('Webhook')`
                          );

                          // Step 2: Transform .json to .json.body for webhook references
                          transformed = transformed.replace(
                            /\$\('Webhook'\)\.first\(\)\.json\./g,
                            `$('Webhook').first().json.body.`
                          );
                          transformed = transformed.replace(
                            /\$\('Webhook'\)\.last\(\)\.json\./g,
                            `$('Webhook').first().json.body.` // Convert .last() to .first() for webhooks
                          );
                          transformed = transformed.replace(
                            /\$\('Webhook'\)\.item\.json\./g,
                            `$('Webhook').item.json.body.`
                          );

                          // Step 3: Transform common chat message patterns
                          // Basic $json patterns for chat messages
                          const chatPatterns = [
                            {
                              from: "{{ $json.message }}",
                              to: "{{ $json.body.message }}",
                            },
                            {
                              from: "{{$json.message}}",
                              to: "{{ $json.body.message }}",
                            },
                            {
                              from: "{{ $json.sessionId }}",
                              to: "{{ $json.body.sessionId }}",
                            },
                            {
                              from: "{{$json.sessionId}}",
                              to: "{{ $json.body.sessionId }}",
                            },
                            {
                              from: "{{ $json.timestamp }}",
                              to: "{{ $json.body.timestamp }}",
                            },
                            {
                              from: "{{$json.timestamp}}",
                              to: "{{ $json.body.timestamp }}",
                            },
                          ];

                          chatPatterns.forEach((pattern) => {
                            transformed = transformed.replace(
                              new RegExp(
                                pattern.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                                "g"
                              ),
                              pattern.to
                            );
                          });

                          return transformed;
                        } else if (Array.isArray(obj)) {
                          return obj.map(transformParameters);
                        } else if (obj && typeof obj === "object") {
                          const result: any = {};
                          for (const key in obj) {
                            result[key] = transformParameters(obj[key]);
                          }
                          return result;
                        }
                        return obj;
                      };

                      return {
                        ...node,
                        parameters: transformParameters(node.parameters),
                      };
                    });

                  }

                  // Add "Respond to Webhook" node at the end of the workflow
                  const respondNodeId = generateId();
                  const respondNode = {
                    parameters: {
                      respondWith: "json",
                      responseBody: "={{ $json.output.toJsonString() }}",
                      options: {}
                    },
                    type: "n8n-nodes-base.respondToWebhook",
                    typeVersion: 1.4,
                    position: [224, 16], // Position from sample
                    id: respondNodeId,
                    name: "Respond to Webhook"
                  };

                  // Add the response node to the workflow
                  workflow.nodes.push(respondNode);

                  // Update connections for complete request-response cycle
                  // Clear existing connections and rebuild them properly
                  workflow.connections = {};
                  
                  // Main flow: Webhook → AI Agent → Respond to Webhook
                  workflow.connections["Webhook"] = {
                    main: [
                      [
                        {
                          node: "AI Agent",
                          type: "main",
                          index: 0
                        }
                      ]
                    ]
                  };

                  // Find AI Agent nodes and connect them to the response node
                  const aiAgentNodes = workflow.nodes.filter((node: any) => 
                    node.type === "@n8n/n8n-nodes-langchain.agent"
                  );

                  if (aiAgentNodes.length > 0) {
                    aiAgentNodes.forEach((agentNode: any) => {
                      workflow.connections[agentNode.name] = {
                        main: [
                          [
                            {
                              node: "Respond to Webhook",
                              type: "main",
                              index: 0
                            }
                          ]
                        ]
                      };
                    });
                  }

                  // Preserve OpenAI model connections
                  const openAiNodes = workflow.nodes.filter((node: any) => 
                    node.type === "@n8n/n8n-nodes-langchain.lmChatOpenAi"
                  );

                  if (openAiNodes.length > 0) {
                    openAiNodes.forEach((openAiNode: any) => {
                      workflow.connections[openAiNode.name] = {
                        ai_languageModel: [
                          [
                            {
                              node: "AI Agent",
                              type: "ai_languageModel",
                              index: 0
                            }
                          ]
                        ]
                      };
                    });
                  }

                  // Update workflow name
                  workflow.name = EditedWorkflowName;

                  return workflow;
                })();

                return (
                  <>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium">🔄 Complete Transformation Summary:</p>
                      <div className="bg-green-50 p-3 rounded-lg space-y-1">
                        <p className="text-xs">
                          ✅ <strong>Webhook Node:</strong> Added with responseMode="responseNode" (waits for response)
                        </p>
                        <p className="text-xs">
                          ✅ <strong>AI Agent:</strong> Updated with promptType="define", text={`"={{ $json.body.message }}"`}, system message
                        </p>
                        <p className="text-xs">
                          ✅ <strong>Response Node:</strong> Added "Respond to Webhook" node with JSON output
                        </p>
                        <p className="text-xs">
                          ✅ <strong>OpenAI Model:</strong> Preserved existing OpenAI nodes with ai_languageModel connections
                        </p>
                        <p className="text-xs">
                          ✅ <strong>Complete Flow:</strong> Webhook → AI Agent → Respond to Webhook + OpenAI → AI Agent
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium">Webhook Details:</p>
                      <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                        <p className="text-xs">
                          <strong>Webhook ID:</strong> {webhookId}
                        </p>
                        <p className="text-xs">
                          <strong>Webhook URL:</strong> {instanceUrl}/webhook/
                          {webhookId}
                        </p>
                        <p className="text-xs">
                          <strong>Method:</strong> POST
                        </p>
                        <p className="text-xs">
                          <strong>Expected Body:</strong> {`{"message": "user message", "sessionId": "optional"}`}
                        </p>
                        <p className="text-xs">
                          <strong>Response Format:</strong> {`{"output": "AI response"}`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium">📝 Usage Instructions:</p>
                      <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                        <p className="text-xs">
                          <strong>1.</strong> Import the transformed workflow into your n8n instance
                        </p>
                        <p className="text-xs">
                          <strong>2.</strong> Activate the workflow to enable the webhook endpoint
                        </p>
                        <p className="text-xs">
                          <strong>3.</strong> Send POST requests to the webhook URL with message data
                        </p>
                        <p className="text-xs">
                          <strong>4.</strong> The AI will process messages and return responses via the webhook
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium">Message Mappings:</p>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                        <p className="text-xs font-mono">
                          {`{{ $json.message }}`} → {`{{ $json.body.message }}`}
                        </p>
                        <p className="text-xs font-mono">
                          {`{{ $json.sessionId }}`} → {`{{ $json.body.sessionId }}`}
                        </p>
                        <p className="text-xs font-mono">
                          {`{{ $json.timestamp }}`} → {`{{ $json.body.timestamp }}`}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify(transformedWorkflow, null, 2)}
                      </pre>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => {
                          const blob = new Blob(
                            [JSON.stringify(transformedWorkflow, null, 2)],
                            { type: "application/json" }
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${EditedWorkflowName}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        📥 Download Transformed Workflow
                      </Button>

                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(transformedWorkflow, null, 2)
                          );
                          alert("Transformed workflow copied to clipboard!");
                        }}
                        variant="outline"
                      >
                        📋 Copy to Clipboard
                      </Button>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}


        {/* Hidden Trigger Nodes JSON Display */}
        {false && triggerNodes.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Trigger Nodes</CardTitle>
              <p className="text-sm text-gray-500">
                Chat trigger nodes found in this workflow (
                {triggerNodes.length} node{triggerNodes.length !== 1 ? "s" : ""}
                )
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(triggerNodes, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Hidden extracted chat data - used internally for webhook ID */}
        {false && extractedChatData && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>✅ Extracted Chat Configuration</CardTitle>
              <p className="text-sm text-gray-500">
                Successfully found and analyzed chat trigger: <strong>{extractedChatData.triggerType}</strong>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Chat Trigger Info - Always show */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">📋 Chat Trigger Details</h4>
                <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                  <p className="text-xs"><strong>Name:</strong> {extractedChatData.chatTitle}</p>
                  <p className="text-xs"><strong>Type:</strong> {extractedChatData.triggerType}</p>
                  {extractedChatData.typeVersion && (
                    <p className="text-xs"><strong>Version:</strong> {extractedChatData.typeVersion}</p>
                  )}
                  <p className="text-xs"><strong>Node ID:</strong> <code className="bg-white px-1 rounded">{extractedChatData.nodeId}</code></p>
                  {extractedChatData.webhookId && (
                    <p className="text-xs"><strong>Webhook ID:</strong> <code className="bg-white px-1 rounded">{extractedChatData.webhookId}</code></p>
                  )}
                  {extractedChatData.isPublic !== undefined && (
                    <p className="text-xs"><strong>Public Access:</strong> {extractedChatData.isPublic ? '✅ Yes' : '❌ No'}</p>
                  )}
                </div>
              </div>

              {/* Connected Nodes Analysis */}
              {extractedChatData.connectedNodes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">🔗 Connected Workflow Nodes</h4>
                  
                  {/* AI Models */}
                  {extractedChatData.connectedNodes.aiModels && extractedChatData.connectedNodes.aiModels.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-2">🤖 AI Models ({extractedChatData.connectedNodes.aiModels.length}):</p>
                      {extractedChatData.connectedNodes.aiModels.map((model, idx) => (
                        <div key={idx} className="bg-white p-2 rounded mb-2 last:mb-0">
                          <p className="text-xs"><strong>Name:</strong> {model.name}</p>
                          <p className="text-xs"><strong>Type:</strong> {model.type}</p>
                          {model.model && (
                            <p className="text-xs"><strong>Model:</strong> {model.model}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* AI Agents */}
                  {extractedChatData.connectedNodes.agents && extractedChatData.connectedNodes.agents.length > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-2">🎯 AI Agents ({extractedChatData.connectedNodes.agents.length}):</p>
                      {extractedChatData.connectedNodes.agents.map((agent, idx) => (
                        <div key={idx} className="bg-white p-2 rounded mb-2 last:mb-0">
                          <p className="text-xs"><strong>Name:</strong> {agent.name}</p>
                          <p className="text-xs"><strong>Type:</strong> {agent.type}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Configuration - Only show if present */}
              {(extractedChatData.chatDescription || extractedChatData.chatModel || extractedChatData.modelSettings || extractedChatData.systemMessage || extractedChatData.memorySettings || extractedChatData.promptTemplate || extractedChatData.chatSettings) && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-t pt-3">⚙️ Advanced Configuration</h4>
                  
                  {/* Description */}
                  {extractedChatData.chatDescription && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-medium">Description:</p>
                      <p className="text-xs mt-1">{extractedChatData.chatDescription}</p>
                    </div>
                  )}

                  {/* Model Info */}
                  {extractedChatData.chatModel && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-xs"><strong>Direct Model:</strong> {extractedChatData.chatModel}</p>
                    </div>
                  )}

                  {/* Model Settings */}
                  {extractedChatData.modelSettings && (
                    <div className="bg-green-50 p-3 rounded-lg space-y-1">
                      <p className="text-xs font-medium">Model Settings:</p>
                      {Object.entries(extractedChatData.modelSettings).map(([key, value]) => 
                        value !== undefined && (
                          <p key={key} className="text-xs"><strong>{key}:</strong> {String(value)}</p>
                        )
                      )}
                    </div>
                  )}

                  {/* System Message */}
                  {extractedChatData.systemMessage && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-xs font-medium">System Message:</p>
                      <p className="text-xs font-mono mt-1 whitespace-pre-wrap">{extractedChatData.systemMessage}</p>
                    </div>
                  )}

                  {/* Memory Settings */}
                  {extractedChatData.memorySettings && (
                    <div className="bg-purple-50 p-3 rounded-lg space-y-1">
                      <p className="text-xs font-medium">Memory Configuration:</p>
                      {Object.entries(extractedChatData.memorySettings).map(([key, value]) => 
                        value !== undefined && (
                          <p key={key} className="text-xs"><strong>{key}:</strong> {String(value)}</p>
                        )
                      )}
                    </div>
                  )}

                  {/* Other settings... */}
                  {extractedChatData.promptTemplate && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-xs font-medium">Prompt Template:</p>
                      <p className="text-xs font-mono mt-1 whitespace-pre-wrap">{extractedChatData.promptTemplate}</p>
                    </div>
                  )}

                  {extractedChatData.chatSettings && (
                    <div className="bg-pink-50 p-3 rounded-lg space-y-1">
                      <p className="text-xs font-medium">Chat Settings:</p>
                      {Object.entries(extractedChatData.chatSettings).map(([key, value]) => 
                        value !== undefined && (
                          <p key={key} className="text-xs"><strong>{key}:</strong> {String(value)}</p>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Note for simple triggers */}
              {!extractedChatData.chatModel && !extractedChatData.modelSettings && !extractedChatData.systemMessage && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>ℹ️ Simple Chat Trigger:</strong> This chat trigger uses basic configuration. 
                    AI model settings and logic are likely configured in the connected nodes shown above.
                  </p>
                </div>
              )}

              {/* Raw Parameters for debugging */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium hover:text-blue-600">🔍 View Raw Configuration Data</summary>
                <div className="mt-2 bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(extractedChatData, null, 2)}
                  </pre>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-semibold">Step 3: Simple Chat Interface</h2>

        {/* Simple Chat Interface */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Chat Interface</CardTitle>
            <p className="text-sm text-gray-600">
              Send messages to your n8n chat workflow
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URL Input */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                n8n Webhook URL
              </label>
              <Input
                type="url"
                placeholder={extractedChatData?.webhookId ? 
                  `https://your-instance.n8n.cloud/webhook/${extractedChatData.webhookId}` : 
                  "https://your-instance.n8n.cloud/webhook/..."
                }
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-blue-700 mt-1">
                Enter the webhook URL from your n8n workflow to send chat messages
              </p>
              {extractedChatData?.webhookId && (
                <p className="text-xs text-blue-800 mt-1">
                  💡 Expected: <code className="bg-white px-1 rounded">https://your-instance.n8n.cloud/webhook/{extractedChatData?.webhookId}</code>
                </p>
              )}
            </div>

            {/* Chat Messages Display */}
            <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">No messages yet. Start a conversation!</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        msg.role === "user" 
                          ? "bg-blue-100 ml-auto max-w-[70%]" 
                          : "bg-white max-w-[70%]"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !chatLoading && handleSendMessage()}
                disabled={chatLoading || !webhookUrl}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={chatLoading || !webhookUrl || !inputMessage.trim()}
              >
                {chatLoading ? "Sending..." : "Send"}
              </Button>
            </div>

            {!webhookUrl && (
              <p className="text-xs text-orange-600 text-center">
                ⚠️ Please enter a webhook URL above to start chatting
              </p>
            )}
          </CardContent>
        </Card>

        {/* Hidden extraction failure message */}
        {false && triggerNodes.length > 0 && !extractedChatData && (
          <Card className="w-full border-orange-500">
            <CardHeader>
              <CardTitle className="text-orange-700">⚠️ Chat Data Extraction Issue</CardTitle>
              <p className="text-sm text-gray-500">
                Found trigger nodes but could not extract chat configuration
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-orange-800 font-medium mb-2">Possible Issues:</p>
                  <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                    <li>The chat trigger node may have a different parameter structure than expected</li>
                    <li>The workflow might be using a different version of the chat trigger</li>
                    <li>Required chat parameters may be missing or configured differently</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Trigger Node Details:</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
                    {JSON.stringify(triggerNodes, null, 2)}
                  </pre>
                </div>
                
                <p className="text-sm text-gray-600">
                  <strong>Expected trigger type:</strong> <code>@n8n/n8n-nodes-langchain.chatTrigger</code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-semibold">
          Step 6: Create New Workflow With Webhook
        </h2>
        <CreateWorkflowComponent workflowName={EditedWorkflowName} />

        <h2 className="text-xl font-semibold">
          Step 7: Create Transformed Chat Workflow in n8n
        </h2>

        {workflowData && triggerNodes.length > 0 && (
          <Card className="w-full border-purple-500">
            <CardHeader>
              <CardTitle>🚀 Upload Transformed Chat Workflow</CardTitle>
              <p className="text-sm text-gray-500">
                Upload the transformed workflow (chat trigger → webhook) directly to
                your n8n instance with a single click.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium mb-2">
                    📋 What this will upload:
                  </p>
                  <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                    <li>
                      Webhook trigger with responseMode (waits for AI response)
                    </li>
                    <li>
                      AI Agent configured to process messages from webhook body
                    </li>
                    <li>
                      Respond to Webhook node for JSON response output
                    </li>
                    <li>
                      Complete connection flow with preserved OpenAI models
                    </li>
                    <li>
                      Unique webhook ID and node IDs generated automatically
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    ⚠️ Before Uploading:
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li>
                      This will create a new workflow using the transformation from Step 2
                    </li>
                    <li>
                      The original chat trigger will be replaced with a webhook trigger
                    </li>
                    <li>
                      You can download the transformed JSON above first if needed
                    </li>
                    <li>
                      Make sure your n8n instance has the required AI/LangChain nodes
                    </li>
                  </ul>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    <strong>Final Workflow Name:</strong> {FinalWorkflowName}
                  </p>

                  {(() => {
                    // Get the transformed workflow from Step 2
                    if (!workflowData) return null;
                    
                    // Generate the transformed workflow (same logic as Step 2)
                    const generateId = () => {
                      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        return crypto.randomUUID();
                      }
                      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                      });
                    };
                    const webhookId = generateId();
                    const webhookNodeId = generateId();

                    const webhookNode = {
                      parameters: {
                        httpMethod: "POST",
                        path: webhookId,
                        responseMode: "responseNode",
                        options: {},
                      },
                      type: "n8n-nodes-base.webhook",
                      typeVersion: 2.1,
                      position: [0, 0],
                      id: webhookNodeId,
                      name: "Webhook",
                      webhookId: webhookId,
                    };

                    const transformedWorkflow = (() => {
                      const workflow = JSON.parse(JSON.stringify(workflowData));
                      const chatTriggerIndex = workflow.nodes?.findIndex(
                        (node: any) => node.type === "@n8n/n8n-nodes-langchain.chatTrigger"
                      );

                      if (chatTriggerIndex !== -1 && workflow.nodes) {
                        const chatTrigger = workflow.nodes[chatTriggerIndex];
                        webhookNode.position = chatTrigger.position || [0, 0];
                        workflow.nodes[chatTriggerIndex] = webhookNode;

                        if (workflow.connections && workflow.connections[chatTrigger.name]) {
                          workflow.connections["Webhook"] = workflow.connections[chatTrigger.name];
                          delete workflow.connections[chatTrigger.name];
                        }

                        workflow.nodes = workflow.nodes.map((node: any) => {
                          if (node.id === webhookNodeId) return node;

                          if (node.type === "@n8n/n8n-nodes-langchain.agent") {
                            return {
                              ...node,
                              parameters: {
                                ...node.parameters,
                                promptType: "define",
                                text: "={{ $json.body.message }}",
                                options: {
                                  ...node.parameters?.options,
                                  systemMessage: "You are a helpful assistant"
                                }
                              }
                            };
                          }

                          const transformParameters = (obj: any): any => {
                            if (typeof obj === "string") {
                              let transformed = obj;
                              const chatTriggerNodeName = chatTrigger.name || "When chat message received";
                              const escapedNodeName = chatTriggerNodeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                              transformed = transformed.replace(new RegExp(`\\$\\('${escapedNodeName}'\\)`, "g"), `$('Webhook')`);
                              transformed = transformed.replace(/\$\('Webhook'\)\.first\(\)\.json\./g, `$('Webhook').first().json.body.`);
                              transformed = transformed.replace(/\$\('Webhook'\)\.last\(\)\.json\./g, `$('Webhook').first().json.body.`);
                              transformed = transformed.replace(/\$\('Webhook'\)\.item\.json\./g, `$('Webhook').item.json.body.`);

                              const chatPatterns = [
                                { from: "{{ $json.message }}", to: "{{ $json.body.message }}" },
                                { from: "{{$json.message}}", to: "{{ $json.body.message }}" },
                                { from: "{{ $json.sessionId }}", to: "{{ $json.body.sessionId }}" },
                                { from: "{{$json.sessionId}}", to: "{{ $json.body.sessionId }}" },
                                { from: "{{ $json.timestamp }}", to: "{{ $json.body.timestamp }}" },
                                { from: "{{$json.timestamp}}", to: "{{ $json.body.timestamp }}" },
                              ];

                              chatPatterns.forEach((pattern) => {
                                transformed = transformed.replace(
                                  new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
                                  pattern.to
                                );
                              });

                              return transformed;
                            } else if (Array.isArray(obj)) {
                              return obj.map(transformParameters);
                            } else if (obj && typeof obj === "object") {
                              const result: any = {};
                              for (const key in obj) {
                                result[key] = transformParameters(obj[key]);
                              }
                              return result;
                            }
                            return obj;
                          };

                          return {
                            ...node,
                            parameters: transformParameters(node.parameters),
                          };
                        });

                        // Add "Respond to Webhook" node
                        const respondNodeId = generateId();
                        const respondNode = {
                          parameters: {
                            respondWith: "json",
                            responseBody: "={{ $json.output.toJsonString() }}",
                            options: {}
                          },
                          type: "n8n-nodes-base.respondToWebhook",
                          typeVersion: 1.4,
                          position: [224, 16],
                          id: respondNodeId,
                          name: "Respond to Webhook"
                        };

                        workflow.nodes.push(respondNode);

                        // Update connections
                        workflow.connections = {};
                        workflow.connections["Webhook"] = {
                          main: [
                            [
                              {
                                node: "AI Agent",
                                type: "main",
                                index: 0
                              }
                            ]
                          ]
                        };

                        const aiAgentNodes = workflow.nodes.filter((node: any) => 
                          node.type === "@n8n/n8n-nodes-langchain.agent"
                        );

                        if (aiAgentNodes.length > 0) {
                          aiAgentNodes.forEach((agentNode: any) => {
                            workflow.connections[agentNode.name] = {
                              main: [
                                [
                                  {
                                    node: "Respond to Webhook",
                                    type: "main",
                                    index: 0
                                  }
                                ]
                              ]
                            };
                          });
                        }

                        const openAiNodes = workflow.nodes.filter((node: any) => 
                          node.type === "@n8n/n8n-nodes-langchain.lmChatOpenAi"
                        );

                        if (openAiNodes.length > 0) {
                          openAiNodes.forEach((openAiNode: any) => {
                            workflow.connections[openAiNode.name] = {
                              ai_languageModel: [
                                [
                                  {
                                    node: "AI Agent",
                                    type: "ai_languageModel",
                                    index: 0
                                  }
                                ]
                              ]
                            };
                          });
                        }
                      }

                      workflow.name = EditedWorkflowName;
                      return workflow;
                    })();

                    return (
                      <Button
                        onClick={() =>
                          handleUploadTransformedChatWorkflow(
                            workflowData,
                            extractedChatData!,
                            transformedWorkflow,
                            { instanceUrl, apiKey },
                            FinalWorkflowName,
                            setIsUploadingFinal,
                            setUploadFinalResult
                          )
                        }
                        disabled={isUploadingFinal}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isUploadingFinal
                          ? "Uploading..."
                          : "🚀 Upload Transformed Chat Workflow to n8n"}
                      </Button>
                    );
                  })()}

                  {uploadFinalResult && (
                    <div
                      className={`mt-4 p-4 rounded-md border ${
                        uploadFinalResult.success
                          ? "bg-green-50 text-green-800 border-green-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      <p className="font-medium">{uploadFinalResult.message}</p>
                      {uploadFinalResult.success &&
                        uploadFinalResult.workflow && (
                          <div className="mt-3 text-sm space-y-1">
                            <p>
                              <strong>Workflow ID:</strong>{" "}
                              {uploadFinalResult.workflow.id}
                            </p>
                            <p>
                              <strong>Workflow Name:</strong>{" "}
                              {uploadFinalResult.workflow.name}
                            </p>
                            <p>
                              <strong>Webhook URL:</strong> {instanceUrl}
                              /webhook/{uploadFinalResult.workflow.webhookId}
                            </p>
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-xs text-yellow-800">
                                <strong>💡 Next Steps:</strong> Your transformed chat workflow is now ready! 
                                You can test it by sending POST requests to the webhook URL above with 
                                JSON body: {`{"message": "your message", "sessionId": "optional"}`}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

// Chat data interfaces
interface ChatData {
  // Basic fields that should always be present
  chatTitle: string;
  webhookId?: string;
  isPublic?: boolean;
  triggerType: string;
  typeVersion?: number;
  nodeId: string;
  
  // Optional advanced fields
  chatDescription?: string;
  chatModel?: string;
  modelSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  systemMessage?: string;
  memorySettings?: {
    type?: string;
    maxMessages?: number;
    returnMessages?: number;
  };
  promptTemplate?: string;
  chatSettings?: {
    responseMode?: string;
    sessionIdExpression?: string;
  };
  
  // Connected nodes information
  connectedNodes?: {
    aiModels?: Array<{
      name: string;
      type: string;
      model?: string;
      settings?: Record<string, unknown>;
    }>;
    agents?: Array<{
      name: string;
      type: string;
      settings?: Record<string, unknown>;
    }>;
  };
  
  rawParameters?: Record<string, unknown>;
}

// Extract chat data function
function extractChatData(jsonData: N8nNode[], workflowData?: WorkflowData): ChatData | null {
  try {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return null;
    }

    const chatTrigger = jsonData.find(
      (node) => node.type === "@n8n/n8n-nodes-langchain.chatTrigger"
    );

    if (!chatTrigger) {
      return null;
    }

    const params = chatTrigger.parameters || {};

    // Extract basic information that should always be present
    const chatTitle = chatTrigger.name || "Chat Interface";
    const webhookId = chatTrigger.webhookId;
    const isPublic = params.public;
    const triggerType = chatTrigger.type;
    const typeVersion = chatTrigger.typeVersion;
    const nodeId = chatTrigger.id;

    // Extract optional advanced configuration (if present)
    const chatDescription = params.description || params.chatDescription || "";
    const chatModel = params.model?.value || params.model || "";
    
    // Extract model settings (if present)
    const modelSettings = {
      temperature: params.options?.temperature,
      maxTokens: params.options?.maxTokens || params.options?.maxOutputTokens,
      topP: params.options?.topP,
      frequencyPenalty: params.options?.frequencyPenalty,
      presencePenalty: params.options?.presencePenalty,
    };
    const hasModelSettings = Object.values(modelSettings).some(val => val !== undefined);

    // Extract system message/prompt (if present)
    const systemMessage = params.systemMessage?.value || params.systemMessage || params.prompt || "";

    // Extract memory settings (if present)
    const memorySettings = {
      type: params.memory?.value || params.memory,
      maxMessages: params.options?.maxMessages || params.maxMessages,
      returnMessages: params.options?.returnMessages || params.returnMessages,
    };
    const hasMemorySettings = Object.values(memorySettings).some(val => val !== undefined);

    // Extract prompt template (if present)
    const promptTemplate = params.promptTemplate?.value || params.promptTemplate || "";

    // Extract chat-specific settings (if present)
    const chatSettings = {
      responseMode: params.responseMode?.value || params.responseMode,
      sessionIdExpression: params.sessionIdExpression || params.sessionId,
    };
    const hasChatSettings = Object.values(chatSettings).some(val => val !== undefined);

    // Analyze connected nodes if workflow data is available
    let connectedNodes;
    if (workflowData?.nodes && workflowData?.connections) {
      connectedNodes = analyzeConnectedNodes(chatTrigger.name, workflowData);
    }

    return {
      // Basic fields
      chatTitle,
      webhookId,
      isPublic,
      triggerType,
      typeVersion,
      nodeId,
      
      // Optional advanced fields (only include if they have values)
      chatDescription: chatDescription || undefined,
      chatModel: chatModel || undefined,
      modelSettings: hasModelSettings ? modelSettings : undefined,
      systemMessage: systemMessage || undefined,
      memorySettings: hasMemorySettings ? memorySettings : undefined,
      promptTemplate: promptTemplate || undefined,
      chatSettings: hasChatSettings ? chatSettings : undefined,
      connectedNodes,
      rawParameters: params,
    };
  } catch (error) {
    console.error("Error extracting chat data:", error);
    console.log("jsonData structure:", JSON.stringify(jsonData, null, 2));
    return null;
  }
}

// Helper function to analyze connected nodes
function analyzeConnectedNodes(chatTriggerName: string, workflowData: WorkflowData) {
  try {
    const connections = workflowData.connections?.[chatTriggerName];
    if (!connections || !workflowData.nodes) {
      return undefined;
    }

    const connectedNodeNames = new Set<string>();
    
    // Extract all connected node names
    Object.values(connections).forEach((connectionArray: any) => {
      if (Array.isArray(connectionArray)) {
        connectionArray.forEach((connArray: any) => {
          if (Array.isArray(connArray)) {
            connArray.forEach((conn: any) => {
              if (conn.node) {
                connectedNodeNames.add(conn.node);
              }
            });
          }
        });
      }
    });

    const aiModels: any[] = [];
    const agents: any[] = [];

    // Find connected nodes and categorize them
    workflowData.nodes.forEach((node: any) => {
      if (connectedNodeNames.has(node.name)) {
        if (node.type?.includes('lm') || node.type?.includes('Chat') || node.type?.includes('openai')) {
          aiModels.push({
            name: node.name,
            type: node.type,
            model: node.parameters?.model?.value || node.parameters?.model,
            settings: node.parameters,
          });
        } else if (node.type?.includes('agent')) {
          agents.push({
            name: node.name,
            type: node.type,
            settings: node.parameters,
          });
        }
      }
    });

    return {
      aiModels: aiModels.length > 0 ? aiModels : undefined,
      agents: agents.length > 0 ? agents : undefined,
    };
  } catch (error) {
    console.error("Error analyzing connected nodes:", error);
    return undefined;
  }
}

// Upload handler for Step 7 - Chat Workflow Upload
const handleUploadTransformedChatWorkflow = async (
  workflowData: WorkflowData,
  extractedChatData: ChatData,
  transformedWorkflow: any, // The already-generated transformation from Step 2
  credentials: { instanceUrl: string; apiKey: string },
  finalWorkflowName: string, // Final workflow name parameter
  setIsUploadingFinal: (loading: boolean) => void,
  setUploadFinalResult: (
    result: { success: boolean; message: string; workflow?: any } | null
  ) => void
) => {
  setIsUploadingFinal(true);
  setUploadFinalResult(null);

  try {
    // Use the transformed workflow that was already generated in Step 2
    const finalWorkflow = {
      ...transformedWorkflow,
      name: finalWorkflowName,
    };

    const response = await fetch("/api/n8n/createWorkflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceUrl: credentials.instanceUrl,
        apiKey: credentials.apiKey,
        workflowData: finalWorkflow,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Extract webhook ID from the transformed workflow
      const webhookNode = finalWorkflow.nodes?.find((node: any) => 
        node.type === "n8n-nodes-base.webhook"
      );
      const webhookId = webhookNode?.webhookId || webhookNode?.parameters?.path;

      setUploadFinalResult({
        success: true,
        message: `Transformed chat workflow "${finalWorkflow.name}" created successfully!`,
        workflow: { ...data.workflow, webhookId },
      });
    } else {
      setUploadFinalResult({
        success: false,
        message: data.error || "Failed to create transformed chat workflow",
      });
    }
  } catch (error) {
    setUploadFinalResult({
      success: false,
      message: `Error uploading workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  } finally {
    setIsUploadingFinal(false);
  }
};