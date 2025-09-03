"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import testWorkflow from "@/lib/testWorkflow.json"

export default function CreateWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    workflow?: any
  } | null>(null)
  const [credentials, setCredentials] = useState<{
    instanceUrl: string
    apiKey: string
  } | null>(null)

  // Load credentials from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('n8n-credentials')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setCredentials(parsed)
        } catch (error) {
          console.error('Failed to parse stored credentials:', error)
          // Use default values as fallback
          setCredentials({
            instanceUrl: "https://henrymunoz1.app.n8n.cloud",
            apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YWExYWYxZS1iMDY4LTQyMDEtYmM5My0yYzFiMmUwNWZlYTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2ODM2MDk4LCJleHAiOjE3NTkzNzc2MDB9.4c8KEGMtuWjTShBWG-fYrPWxg4zj-iTLgXqPpO0MF3I",
          })
        }
      } else {
        // Use default values when no stored credentials
        setCredentials({
          instanceUrl: "https://henrymunoz1.app.n8n.cloud",
          apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YWExYWYxZS1iMDY4LTQyMDEtYmM5My0yYzFiMmUwNWZlYTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2ODM2MDk4LCJleHAiOjE3NTkzNzc2MDB9.4c8KEGMtuWjTShBWG-fYrPWxg4zj-iTLgXqPpO0MF3I",
        })
      }
    }
  }, [])

  const handleCreateWorkflow = async () => {
    if (!credentials) {
      setResult({
        success: false,
        message: "Failed to load credentials. Please try again."
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/n8n/createWorkflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceUrl: credentials.instanceUrl,
          apiKey: credentials.apiKey,
          workflowData: testWorkflow,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: `Workflow "${testWorkflow.name}" created successfully!`,
          workflow: data.workflow
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to create workflow'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while creating the workflow'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-medium tracking-tight">
            Now generating a copy of your n8n workflow to work with the form we just created for you
          </h1>
          
          <Button onClick={handleCreateWorkflow} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Now"}
          </Button>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-md border ${
            result.success 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <p className="font-medium">{result.message}</p>
            {result.success && result.workflow && (
              <div className="mt-3 text-sm">
                <p>Workflow ID: {result.workflow.id}</p>
                <p>Workflow Name: {result.workflow.name}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}