"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
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

const formSchema = z.object({
  instanceUrl: z.string().url({
    message: "Please enter a valid URL.",
  }),
  apiKey: z.string().min(1, {
    message: "API Key is required.",
  }),
})

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
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
      instanceUrl: "",
      apiKey: "",
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to FlowFront</h1>
          <p className="mt-2 text-sm text-gray-600">
            Convert your n8n workflows into simple web forms
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="instanceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N8N Instance URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-instance.n8n.cloud" {...field} />
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
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Enter your API key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Testing Connection..." : "Test Connection"}
            </Button>
          </form>
        </Form>

        {connectionResult && (
          <div
            className={`mt-4 p-4 rounded-md ${
              connectionResult.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <p className="font-medium">{connectionResult.message}</p>
            {connectionResult.success && connectionResult.workflowCount !== undefined && (
              <>
                <p className="mt-1 text-sm">
                  Found {connectionResult.workflowCount} compatible workflow{connectionResult.workflowCount !== 1 ? 's' : ''} in your n8n instance
                </p>
                
                {connectionResult.chatTriggerWorkflows && connectionResult.chatTriggerWorkflows.count > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">
                      Chat Trigger Workflows ({connectionResult.chatTriggerWorkflows.count}):
                    </p>
                    <ul className="text-sm space-y-1 max-h-24 overflow-y-auto bg-white/50 rounded p-2">
                      {connectionResult.chatTriggerWorkflows.names.map((name, index) => (
                        <li key={index} className="pl-2">• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {connectionResult.formTriggerWorkflows && connectionResult.formTriggerWorkflows.count > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">
                      Form Trigger Workflows ({connectionResult.formTriggerWorkflows.count}):
                    </p>
                    <ul className="text-sm space-y-1 max-h-24 overflow-y-auto bg-white/50 rounded p-2">
                      {connectionResult.formTriggerWorkflows.names.map((name, index) => (
                        <li key={index} className="pl-2">• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {connectionResult.workflowCount === 0 && (
                  <p className="mt-2 text-sm italic">
                    No workflows with chat or form triggers found. Make sure your workflows use either chatTrigger or formTrigger nodes.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}