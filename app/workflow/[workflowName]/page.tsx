"use client"

import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorkflowData, N8nNode, extractTriggerNodes } from "@/lib/workflow-utils"

export default function WorkflowPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const workflowName = decodeURIComponent(params.workflowName as string)
  
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null)
  const [triggerNodes, setTriggerNodes] = useState<N8nNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instanceUrl, setInstanceUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showCredentials, setShowCredentials] = useState(true)

  const fetchWorkflow = useCallback(async () => {
    if (!instanceUrl || !apiKey) {
      setError('Please provide instance URL and API key')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/n8n/singleWorkflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceUrl,
          apiKey,
          workflowName,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setWorkflowData(data.workflow)
        // Extract trigger nodes using utility function
        const triggers = extractTriggerNodes(data.workflow)
        setTriggerNodes(triggers)
        setShowCredentials(false)
      } else {
        setError(data.error || 'Failed to fetch workflow')
      }
    } catch (err) {
      setError('An error occurred while fetching the workflow')
    } finally {
      setIsLoading(false)
    }
  }, [instanceUrl, apiKey, workflowName])

  // Try to get credentials from localStorage on mount
  useEffect(() => {
    const savedInstanceUrl = localStorage.getItem('n8n-instance-url')
    const savedApiKey = localStorage.getItem('n8n-api-key')
    
    if (savedInstanceUrl && savedApiKey) {
      setInstanceUrl(savedInstanceUrl)
      setApiKey(savedApiKey)
      setShowCredentials(false)
    }
  }, [])

  // Auto-fetch when credentials are loaded
  useEffect(() => {
    if (instanceUrl && apiKey && !showCredentials) {
      fetchWorkflow()
    }
  }, [instanceUrl, apiKey, showCredentials])

  const handleCredentialsSubmit = () => {
    // Save credentials to localStorage
    localStorage.setItem('n8n-instance-url', instanceUrl)
    localStorage.setItem('n8n-api-key', apiKey)
    fetchWorkflow()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Workflow</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate form or chat interface for your n8n workflow
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Workflow: {workflowName}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">
              Setting up interface for workflow: <strong>{workflowName}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Workflow creation interface will be implemented here
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
                <label className="block text-sm font-medium mb-2">Instance URL</label>
                <Input
                  type="url"
                  placeholder="https://your-instance.n8n.cloud"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
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

        {/* Trigger Nodes JSON Display */}
        {triggerNodes.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Trigger Nodes</CardTitle>
              <p className="text-sm text-gray-500">
                Form and Chat trigger nodes found in this workflow ({triggerNodes.length} node{triggerNodes.length !== 1 ? 's' : ''})
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

        {/* Show message if no trigger nodes found */}
        {workflowData && triggerNodes.length === 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Trigger Nodes</CardTitle>
              <p className="text-sm text-gray-500">
                No form or chat trigger nodes found in this workflow
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-4">
                This workflow doesn't contain any form trigger or chat trigger nodes.
                <br />
                <span className="text-sm text-gray-500">
                  Supported triggers: n8n-nodes-base.formTrigger, @n8n/n8n-nodes-langchain.chatTrigger
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
      </div>
    </main>
  )
}