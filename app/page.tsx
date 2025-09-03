"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const formSchema = z.object({
  instanceUrl: z.string().url({
    message: "Please enter a valid URL.",
  }),
  apiKey: z.string().min(1, {
    message: "API Key is required.",
  }),
})

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean
    message: string
    workflowCount?: number
    chatTriggerWorkflows?: {
      count: number
      names: string[]
    }
    formTriggerWorkflows?: {
      count: number
      names: string[]
    }
  } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instanceUrl: "https://henrymunoz1.app.n8n.cloud",
      apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YWExYWYxZS1iMDY4LTQyMDEtYmM5My0yYzFiMmUwNWZlYTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2ODM2MDk4LCJleHAiOjE3NTkzNzc2MDB9.4c8KEGMtuWjTShBWG-fYrPWxg4zj-iTLgXqPpO0MF3I",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setConnectionResult(null)

    try {
      const response = await fetch('/api/n8n/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (data.success) {
        // Store credentials in localStorage for other pages to use
        if (typeof window !== 'undefined') {
          localStorage.setItem('n8n-credentials', JSON.stringify(values))
        }
        
        setConnectionResult({
          success: true,
          message: `Successfully connected to n8n instance`,
          workflowCount: data.workflowCount,
          chatTriggerWorkflows: data.chatTriggerWorkflows,
          formTriggerWorkflows: data.formTriggerWorkflows,
        })
      } else {
        setConnectionResult({
          success: false,
          message: data.error || 'Failed to connect to n8n instance',
        })
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: 'An error occurred while testing the connection',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleWorkflowSelection(workflowName: string) {
    setIsLoadingWorkflow(true)

    try {
      // Navigate to the workflow page
      const encodedWorkflowName = encodeURIComponent(workflowName)
      router.push(`/workflow/${encodedWorkflowName}`)
    } catch (error) {
      console.error('Error navigating to workflow:', error)
    } finally {
      setIsLoadingWorkflow(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to FlowFront</h1>
          <p className="mt-2 text-sm text-gray-600">
            Convert your n8n workflows into simple web forms
          </p>
        </div>
        
        {/* Centered Form Container */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Connect Your n8n Instance</CardTitle>
              <CardDescription>
                Enter your n8n details to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="instanceUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Instance URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://your-instance.n8n.cloud" 
                            className="h-11"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your API key" 
                            className="h-11"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-11 mt-6" disabled={isLoading}>
                    {isLoading ? "Testing Connection..." : "Test Connection"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {connectionResult && !connectionResult.success && (
          <div className="mt-4 p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
            <p className="font-medium">{connectionResult.message}</p>
          </div>
        )}

        {connectionResult && connectionResult.success && (
          <>
            <div className="mt-4 p-3 rounded-md bg-green-50 text-green-800 border border-green-200">
              <p className="font-medium">{connectionResult.message}</p>
              <p className="text-sm mt-1">
                Found {connectionResult.workflowCount} compatible workflow{connectionResult.workflowCount !== 1 ? 's' : ''} in your n8n instance
              </p>
            </div>

            {/* Side by Side Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Form Workflows Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generate a form for:</CardTitle>
                  <CardDescription>
                    {connectionResult.formTriggerWorkflows?.count || 0} workflow{connectionResult.formTriggerWorkflows?.count !== 1 ? 's' : ''} with form triggers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {connectionResult.formTriggerWorkflows && connectionResult.formTriggerWorkflows.count > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {connectionResult.formTriggerWorkflows.names.map((name, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left"
                          disabled={isLoadingWorkflow}
                          onClick={() => handleWorkflowSelection(name)}
                        >
                          {isLoadingWorkflow ? "Loading..." : name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No form trigger workflows found</p>
                  )}
                </CardContent>
              </Card>

              {/* Chat Workflows Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generate a chat for:</CardTitle>
                  <CardDescription>
                    {connectionResult.chatTriggerWorkflows?.count || 0} workflow{connectionResult.chatTriggerWorkflows?.count !== 1 ? 's' : ''} with chat triggers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {connectionResult.chatTriggerWorkflows && connectionResult.chatTriggerWorkflows.count > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {connectionResult.chatTriggerWorkflows.names.map((name, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left"
                          disabled={isLoadingWorkflow}
                          onClick={() => handleWorkflowSelection(name)}
                        >
                          {isLoadingWorkflow ? "Loading..." : name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No chat trigger workflows found</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {connectionResult.workflowCount === 0 && (
              <p className="mt-4 text-sm italic text-center text-gray-600">
                No workflows with chat or form triggers found. Make sure your workflows use either chatTrigger or formTrigger nodes.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}