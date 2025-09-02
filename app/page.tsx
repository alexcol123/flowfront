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
    workflowNames?: string[]
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
          workflowNames: data.workflowNames,
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
                  Found {connectionResult.workflowCount} workflow{connectionResult.workflowCount !== 1 ? 's' : ''} in your n8n instance
                </p>
                {connectionResult.workflowNames && connectionResult.workflowNames.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Workflows:</p>
                    <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                      {connectionResult.workflowNames.map((name, index) => (
                        <li key={index} className="pl-2">• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}