import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router: Router = Router();

// Types
interface WorkflowStep {
  id: string;
  type: 'CALL_AGENT' | 'TRANSFER' | 'SWAP' | 'CONDITION' | 'PARALLEL' | 'DELAY' | 'CUSTOM';
  config: {
    agentId?: string;
    targetAddress?: string;
    amount?: string;
    conditionType?: string;
    conditionData?: any;
    delaySeconds?: number;
    customContract?: string;
    customCallData?: string;
    parallelSteps?: string[];
    action?: string;
    [key: string]: any;
  };
  nextOnSuccess?: string;
  nextOnFailure?: string;
}

interface Workflow {
  id: string;
  owner: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isActive: boolean;
  totalExecutions: number;
  successfulExecutions: number;
  createdAt: string;
  lastExecutedAt: string | null;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  executor: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentStep: string | null;
  stepResults: { stepId: string; success: boolean; output: any; timestamp: string }[];
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

const workflows: Map<string, Workflow> = new Map();
const executions: Map<string, WorkflowExecution> = new Map();

// Initialize demo workflows
function initDemoWorkflows() {
  const demoWorkflows: Workflow[] = [
    {
      id: 'workflow-defi-harvest',
      owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      name: 'DeFi Yield Harvester',
      description: 'Automatically harvests yields from multiple protocols, swaps rewards, and compounds positions',
      steps: [
        {
          id: 'step-1',
          type: 'CALL_AGENT',
          config: { agentId: 'agent-defi-strategist' },
          nextOnSuccess: 'step-2',
          nextOnFailure: 'step-error'
        },
        {
          id: 'step-2',
          type: 'CONDITION',
          config: {
            conditionType: 'BALANCE_GT',
            conditionData: { threshold: '1000000' }
          },
          nextOnSuccess: 'step-3',
          nextOnFailure: 'step-end'
        },
        {
          id: 'step-3',
          type: 'SWAP',
          config: {
            targetAddress: '0xVVS_ROUTER',
            amount: 'AUTO'
          },
          nextOnSuccess: 'step-4'
        },
        {
          id: 'step-4',
          type: 'TRANSFER',
          config: {
            targetAddress: '0xCOMPOUND_VAULT',
            amount: 'ALL'
          },
          nextOnSuccess: 'step-end'
        },
        {
          id: 'step-error',
          type: 'CALL_AGENT',
          config: { agentId: 'agent-security-sentinel' },
          nextOnSuccess: 'step-end'
        },
        {
          id: 'step-end',
          type: 'CUSTOM',
          config: {}
        }
      ],
      isActive: true,
      totalExecutions: 156,
      successfulExecutions: 149,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      lastExecutedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'workflow-payment-split',
      owner: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      name: 'Revenue Split Automation',
      description: 'Automatically splits incoming payments between multiple recipients based on configurable ratios',
      steps: [
        {
          id: 'step-1',
          type: 'CALL_AGENT',
          config: { agentId: 'agent-payment-processor' },
          nextOnSuccess: 'step-2'
        },
        {
          id: 'step-2',
          type: 'PARALLEL',
          config: {
            parallelSteps: ['transfer-1', 'transfer-2', 'transfer-3']
          },
          nextOnSuccess: 'step-end'
        },
        {
          id: 'step-end',
          type: 'CUSTOM',
          config: {}
        }
      ],
      isActive: true,
      totalExecutions: 892,
      successfulExecutions: 889,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      lastExecutedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'workflow-rwa-settlement',
      owner: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      name: 'RWA Settlement Pipeline',
      description: 'End-to-end RWA transaction settlement with compliance checks and multi-party verification',
      steps: [
        {
          id: 'step-1',
          type: 'CALL_AGENT',
          config: { agentId: 'agent-security-sentinel' },
          nextOnSuccess: 'step-2',
          nextOnFailure: 'step-reject'
        },
        {
          id: 'step-2',
          type: 'CALL_AGENT',
          config: { agentId: 'agent-rwa-manager' },
          nextOnSuccess: 'step-3'
        },
        {
          id: 'step-3',
          type: 'CONDITION',
          config: {
            conditionType: 'CUSTOM',
            conditionData: { check: 'COMPLIANCE_PASSED' }
          },
          nextOnSuccess: 'step-4',
          nextOnFailure: 'step-reject'
        },
        {
          id: 'step-4',
          type: 'CALL_AGENT',
          config: { agentId: 'agent-payment-processor' },
          nextOnSuccess: 'step-end'
        },
        {
          id: 'step-reject',
          type: 'CUSTOM',
          config: { action: 'NOTIFY_REJECTION' }
        },
        {
          id: 'step-end',
          type: 'CUSTOM',
          config: {}
        }
      ],
      isActive: true,
      totalExecutions: 34,
      successfulExecutions: 32,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastExecutedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    }
  ];

  demoWorkflows.forEach(w => workflows.set(w.id, w));
}

initDemoWorkflows();

// GET /api/workflows - List all workflows
router.get('/', (req: Request, res: Response) => {
  const { owner, active, limit = 20, offset = 0 } = req.query;

  let result = Array.from(workflows.values());

  if (owner) {
    result = result.filter(w => w.owner.toLowerCase() === (owner as string).toLowerCase());
  }

  if (active !== undefined) {
    result = result.filter(w => w.isActive === (active === 'true'));
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    workflows: result,
    pagination: { total, limit: Number(limit), offset: Number(offset) }
  });
});

// GET /api/workflows/:id - Get workflow details
router.get('/:id', (req: Request, res: Response) => {
  const workflow = workflows.get(req.params.id);

  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }

  res.json({ workflow });
});

// POST /api/workflows - Create new workflow
router.post('/', (req: Request, res: Response) => {
  const { name, description, steps, owner } = req.body;

  if (!name || !steps || steps.length === 0 || !owner) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const id = `workflow-${uuidv4().slice(0, 8)}`;

  const workflow: Workflow = {
    id,
    owner,
    name,
    description: description || '',
    steps,
    isActive: true,
    totalExecutions: 0,
    successfulExecutions: 0,
    createdAt: new Date().toISOString(),
    lastExecutedAt: null
  };

  workflows.set(id, workflow);

  res.status(201).json({
    message: 'Workflow created successfully',
    workflow
  });
});

// POST /api/workflows/:id/execute - Execute a workflow
router.post('/:id/execute', async (req: Request, res: Response) => {
  const workflow = workflows.get(req.params.id);
  const { executor, inputs } = req.body;

  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }

  if (!workflow.isActive) {
    res.status(400).json({ error: 'Workflow is not active' });
    return;
  }

  const executionId = `exec-${uuidv4().slice(0, 8)}`;

  const execution: WorkflowExecution = {
    id: executionId,
    workflowId: workflow.id,
    executor: executor || '0x0000000000000000000000000000000000000000',
    status: 'RUNNING',
    currentStep: workflow.steps[0]?.id || null,
    stepResults: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null
  };

  executions.set(executionId, execution);

  // Simulate workflow execution
  setTimeout(() => {
    const exec = executions.get(executionId);
    if (exec) {
      const success = Math.random() > 0.1; // 90% success rate

      // Simulate step results
      for (const step of workflow.steps) {
        exec.stepResults.push({
          stepId: step.id,
          success: true,
          output: { simulated: true, step: step.type },
          timestamp: new Date().toISOString()
        });
      }

      exec.status = success ? 'COMPLETED' : 'FAILED';
      exec.completedAt = new Date().toISOString();
      exec.currentStep = null;

      if (!success) {
        exec.error = 'Simulated failure for demo purposes';
      }

      // Update workflow stats
      workflow.totalExecutions++;
      if (success) {
        workflow.successfulExecutions++;
      }
      workflow.lastExecutedAt = new Date().toISOString();
    }
  }, 2000);

  res.status(202).json({
    message: 'Workflow execution started',
    executionId,
    status: 'RUNNING',
    checkStatusUrl: `/api/workflows/executions/${executionId}`
  });
});

// GET /api/workflows/executions/:id - Get execution status
router.get('/executions/:id', (req: Request, res: Response) => {
  const execution = executions.get(req.params.id);

  if (!execution) {
    res.status(404).json({ error: 'Execution not found' });
    return;
  }

  res.json({ execution });
});

// GET /api/workflows/:id/executions - Get workflow execution history
router.get('/:id/executions', (req: Request, res: Response) => {
  const workflowId = req.params.id;
  const { limit = 10 } = req.query;

  const workflowExecutions = Array.from(executions.values())
    .filter(e => e.workflowId === workflowId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, Number(limit));

  res.json({ executions: workflowExecutions });
});

// PUT /api/workflows/:id - Update workflow
router.put('/:id', (req: Request, res: Response) => {
  const workflow = workflows.get(req.params.id);

  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }

  const { name, description, steps, isActive } = req.body;

  if (name) workflow.name = name;
  if (description !== undefined) workflow.description = description;
  if (steps) workflow.steps = steps;
  if (isActive !== undefined) workflow.isActive = isActive;

  res.json({
    message: 'Workflow updated',
    workflow
  });
});

// DELETE /api/workflows/:id - Deactivate workflow
router.delete('/:id', (req: Request, res: Response) => {
  const workflow = workflows.get(req.params.id);

  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }

  workflow.isActive = false;

  res.json({
    message: 'Workflow deactivated',
    id: workflow.id
  });
});

// GET /api/workflows/templates - Get workflow templates
router.get('/meta/templates', (req: Request, res: Response) => {
  const templates = [
    {
      id: 'template-yield-harvest',
      name: 'Yield Harvester',
      description: 'Automatically harvest and compound yields',
      category: 'defi',
      steps: 4
    },
    {
      id: 'template-payment-split',
      name: 'Payment Splitter',
      description: 'Split payments between multiple recipients',
      category: 'payments',
      steps: 3
    },
    {
      id: 'template-rwa-settlement',
      name: 'RWA Settlement',
      description: 'Complete RWA transaction settlement pipeline',
      category: 'rwa',
      steps: 5
    },
    {
      id: 'template-risk-monitor',
      name: 'Risk Monitor',
      description: 'Monitor positions and trigger alerts',
      category: 'security',
      steps: 3
    }
  ];

  res.json({ templates });
});

export { router as workflowRoutes };
