export interface N8nNode {
  type: string;
  parameters?: Record<string, any>;
  name?: string;
  // other node properties as needed
}

export interface N8nWorkflow {
  id: string;
  name: string;
  isArchived: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: N8nNode[];
  tags?: string[];
}

export interface WorkflowData {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: any;
  settings: any;
  createdAt: string;
  updatedAt: string;
  versionId: string;
}

// Trigger type constants
export const TRIGGER_TYPES = {
  CHAT: "@n8n/n8n-nodes-langchain.chatTrigger",
  FORM: "n8n-nodes-base.formTrigger"
} as const;

/**
 * Groups workflows by their trigger types (chat or form)
 */
export const groupWorkflowsByTriggerType = (workflows: N8nWorkflow[]) => {
  const chatTriggerWorkflows: N8nWorkflow[] = [];
  const formTriggerWorkflows: N8nWorkflow[] = [];
  
  workflows.forEach(workflow => {
    const hasChatTrigger = workflow.nodes?.some(node => node.type === TRIGGER_TYPES.CHAT);
    const hasFormTrigger = workflow.nodes?.some(node => node.type === TRIGGER_TYPES.FORM);
    
    // A workflow could have both types of triggers
    if (hasChatTrigger) {
      chatTriggerWorkflows.push(workflow);
    }
    if (hasFormTrigger) {
      formTriggerWorkflows.push(workflow);
    }
  });
  
  return {
    chatTriggers: chatTriggerWorkflows,
    formTriggers: formTriggerWorkflows
  };
};

/**
 * Extracts nodes that match specific trigger types from a workflow
 */
export const extractTriggerNodes = (workflow: WorkflowData): N8nNode[] => {
  const triggerTypes = [TRIGGER_TYPES.CHAT, TRIGGER_TYPES.FORM];
  
  return workflow.nodes?.filter(node => 
    triggerTypes.includes(node.type as any)
  ) || [];
};

/**
 * Checks if a workflow has any trigger nodes
 */
export const hasTriggerNodes = (workflow: WorkflowData): boolean => {
  return extractTriggerNodes(workflow).length > 0;
};

/**
 * Gets the trigger type of a workflow (returns the first found trigger type)
 */
export const getWorkflowTriggerType = (workflow: WorkflowData): string | null => {
  const triggerNode = extractTriggerNodes(workflow)[0];
  return triggerNode?.type || null;
};