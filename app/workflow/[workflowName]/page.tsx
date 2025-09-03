"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  WorkflowData,
  N8nNode,
  extractTriggerNodes,
} from "@/lib/workflow-utils";

export default function WorkflowPage() {
  const params = useParams();
  const workflowName = decodeURIComponent(params.workflowName as string);

  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [triggerNodes, setTriggerNodes] = useState<N8nNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showCredentials, setShowCredentials] = useState(true);
  const [formSubmissionLoading, setFormSubmissionLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Extract form data from trigger nodes
  const extractedFormData = extractFormData(triggerNodes);
  console.log("extracted form data", extractedFormData);

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
    } catch (err) {
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
  }, [instanceUrl, apiKey, showCredentials]);

  const handleCredentialsSubmit = () => {
    localStorage.setItem("n8n-instance-url", instanceUrl);
    localStorage.setItem("n8n-api-key", apiKey);
    fetchWorkflow();
  };

  // Generate dynamic Zod schema for form validation
  const generateFormSchema = (formFields: FormField[]) => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    formFields.forEach((field) => {
      const fieldName = field.fieldLabel.toLowerCase().replace(/\s+/g, '_');

      switch (field.fieldType) {
        case 'email':
          if (field.requiredField) {
            schemaFields[fieldName] = z.string()
              .email('Please enter a valid email')
              .min(1, `${field.fieldLabel} is required`);
          } else {
            schemaFields[fieldName] = z.string()
              .email('Please enter a valid email')
              .optional();
          }
          break;
          
        case 'file':
          // Parse accepted file types
          const acceptedTypes = field.acceptFileTypes 
            ? field.acceptFileTypes.split(',').map(type => type.trim().toLowerCase())
            : [];
          
          // Validation function for file types
          const validateFileType = (val: unknown) => {
            if (!val || acceptedTypes.length === 0) return true;
            
            const files = field.multipleFiles ? Array.from(val as FileList) : [val as File];
            return files.every((file: File) => {
              const extension = file.name.split('.').pop()?.toLowerCase();
              
              // Check direct extension match
              if (acceptedTypes.includes(extension || '')) return true;
              
              // Check for jpg/jpeg equivalence
              if (extension === 'jpg' && acceptedTypes.includes('jpeg')) return true;
              if (extension === 'jpeg' && acceptedTypes.includes('jpg')) return true;
              
              // Also check MIME type for additional validation
              const mimeType = file.type.toLowerCase();
              if (acceptedTypes.includes('jpeg') && (mimeType === 'image/jpeg' || mimeType === 'image/jpg')) return true;
              if (acceptedTypes.includes('png') && mimeType === 'image/png') return true;
              if (acceptedTypes.includes('webp') && mimeType === 'image/webp') return true;
              if (acceptedTypes.includes('gif') && mimeType === 'image/gif') return true;
              
              return false;
            });
          };
          
          if (field.requiredField) {
            schemaFields[fieldName] = z.any()
              .refine(
                (val) => val != null && (field.multipleFiles ? val.length > 0 : val),
                `${field.fieldLabel} is required`
              )
              .refine(
                validateFileType,
                {
                  message: `Please upload only ${acceptedTypes.join(', ')} files`
                }
              );
          } else {
            schemaFields[fieldName] = z.any()
              .optional()
              .refine(
                validateFileType,
                {
                  message: `Please upload only ${acceptedTypes.join(', ')} files`
                }
              );
          }
          break;
          
        case 'textarea':
          if (field.requiredField) {
            schemaFields[fieldName] = z.string().min(1, `${field.fieldLabel} is required`);
          } else {
            schemaFields[fieldName] = z.string().optional();
          }
          break;
          
        case 'dropdown':
          if (field.requiredField) {
            schemaFields[fieldName] = z.string().min(1, `${field.fieldLabel} is required`);
          } else {
            schemaFields[fieldName] = z.string().optional();
          }
          break;
          
        default:
          if (field.requiredField) {
            schemaFields[fieldName] = z.string().min(1, `${field.fieldLabel} is required`);
          } else {
            schemaFields[fieldName] = z.string().optional();
          }
      }
    });

    return z.object(schemaFields);
  };

  // Initialize form only when we have extracted form data
  const formSchema = extractedFormData ? generateFormSchema(extractedFormData.formFields) : z.object({});
  
  // Type for dynamic form values
  type DynamicFormValues = Record<string, string | File | FileList | undefined>;
  
  const form = useForm<DynamicFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: extractedFormData 
      ? extractedFormData.formFields.reduce((acc, field) => {
          const fieldName = field.fieldLabel.toLowerCase().replace(/\s+/g, '_');
          return { ...acc, [fieldName]: '' };
        }, {} as DynamicFormValues)
      : {},
  });

  // Handle form submission
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    if (!webhookUrl) {
      setSubmissionResult({
        success: false,
        message: "Please enter a webhook URL before submitting the form",
      });
      return;
    }

    setFormSubmissionLoading(true);
    setSubmissionResult(null);
    
    try {
      console.log('Submitting form with data:', data);
      console.log('Webhook URL:', webhookUrl);
      
      const response = await fetch('/api/n8n/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          formData: data,
          workflowName,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSubmissionResult({
          success: true,
          message: result.message || 'Form submitted successfully!',
        });
        console.log('Workflow response:', result.workflowResponse);
        form.reset();
      } else {
        setSubmissionResult({
          success: false,
          message: result.error || 'Error submitting form. Please try again.',
        });
      }
      
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionResult({
        success: false,
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setFormSubmissionLoading(false);
    }
  };

  // Render different field types
  const renderFormField = (field: FormField) => {
    const fieldName = field.fieldLabel.toLowerCase().replace(/\s+/g, '_');

    switch (field.fieldType) {
      case 'file':
        // Convert acceptFileTypes to proper HTML accept attribute format
        const acceptAttribute = field.acceptFileTypes 
          ? field.acceptFileTypes.split(',')
              .map(type => {
                const trimmedType = type.trim().toLowerCase();
                // Add dot prefix if not present and convert common formats
                if (trimmedType === 'jpeg' || trimmedType === 'jpg') return '.jpeg,.jpg,image/jpeg';
                if (trimmedType === 'png') return '.png,image/png';
                if (trimmedType === 'webp') return '.webp,image/webp';
                if (trimmedType === 'gif') return '.gif,image/gif';
                if (trimmedType === 'pdf') return '.pdf,application/pdf';
                // Default: add dot prefix
                return `.${trimmedType}`;
              })
              .join(',')
          : '';
          
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.requiredField && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept={acceptAttribute}
                    multiple={field.multipleFiles}
                    onChange={(e) => {
                      const files = e.target.files;
                      formField.onChange(field.multipleFiles ? files : files?.[0]);
                    }}
                  />
                </FormControl>
                {field.acceptFileTypes && (
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted formats: {field.acceptFileTypes}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.requiredField && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'dropdown':
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.requiredField && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value as string}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.fieldOptions?.values.map((option, index) => (
                      <SelectItem key={index} value={option.option}>
                        {option.option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'email':
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.requiredField && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.requiredField && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

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
            <CardTitle className="text-2xl">Workflow: {workflowName}</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">
              Setting up interface for workflow: <strong>{workflowName}</strong>
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
                No form or chat trigger nodes found in this workflow
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-4">
                This workflow doesn&apos;t contain any form trigger or chat
                trigger nodes.
                <br />
                <span className="text-sm text-gray-500">
                  Supported triggers: n8n-nodes-base.formTrigger,
                  @n8n/n8n-nodes-langchain.chatTrigger
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

        <h2 className="text-xl font-semibold">Step 3: Form Node</h2>
        
        {/* Trigger Nodes JSON Display */}
        {triggerNodes.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Trigger Nodes</CardTitle>
              <p className="text-sm text-gray-500">
                Form and Chat trigger nodes found in this workflow (
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

        <h2 className="text-xl font-semibold">Step 4: Extract Data from the Form Node</h2>

        {/* Display extracted form data */}
        {extractedFormData && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Extracted Form Data</CardTitle>
              <p className="text-sm text-gray-500">
                Successfully extracted form configuration
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(extractedFormData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-semibold">Step 5: Generated Form</h2>

        {/* Render the actual form */}
        {extractedFormData && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{extractedFormData.formTitle}</CardTitle>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {extractedFormData.formDescription}
              </p>
            </CardHeader>
            <CardContent>
              {/* Webhook URL Input */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  n8n Webhook URL
                </label>
                <Input
                  type="url"
                  placeholder="https://your-instance.n8n.cloud/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-blue-700 mt-1">
                  Enter the webhook URL from your n8n workflow to submit the form data
                </p>
              </div>

              {/* Success/Error Messages */}
              {submissionResult && (
                <div
                  className={`mb-4 p-4 rounded-md ${
                    submissionResult.success
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <p className="font-medium">{submissionResult.message}</p>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                  {extractedFormData.formFields.map(renderFormField)}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={formSubmissionLoading || !webhookUrl}
                  >
                    {formSubmissionLoading ? 'Submitting...' : 'Submit Form'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Show message if extraction failed */}
        {triggerNodes.length > 0 && !extractedFormData && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Form Data Extraction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-600 text-center py-4">
                Could not extract form data from trigger nodes. 
                <br />
                <span className="text-sm text-gray-500">
                  Make sure the trigger node has the correct formTitle, formDescription, and formFields structure.
                </span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

// Form data interfaces
interface FormData {
  formTitle: string;
  formDescription: string;
  formFields: FormField[];
}

interface FormField {
  fieldLabel: string;
  fieldType: string;
  multipleFiles?: boolean;
  acceptFileTypes?: string;
  requiredField?: boolean;
  placeholder?: string;
  fieldOptions?: {
    values: { option: string }[];
  };
}

// Extract form data function
function extractFormData(jsonData: N8nNode[]): FormData | null {
  try {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return null;
    }

    const firstItem = jsonData[0];
    if (!firstItem?.parameters) {
      return null;
    }

    const { formTitle, formDescription, formFields } = firstItem.parameters;

    if (!formTitle || !formDescription || !formFields?.values) {
      return null;
    }

    return {
      formTitle,
      formDescription,
      formFields: formFields.values,
    };
  } catch (error) {
    console.error("Error extracting form data:", error);
    return null;
  }
}