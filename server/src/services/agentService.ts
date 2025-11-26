import { GoogleGenerativeAI } from '@google/generative-ai';
import { Agent } from '../entities';
import { AppDataSource } from '../data-source';
import { EmailData } from '../types';
import { createApiResponse } from '../middleware/validation';

interface AgentTask {
  id: string;
  type: 'email' | 'content' | 'analysis' | 'research' | 'communication';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent?: string;
  result?: any;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'agent';
  content: string;
  agentId?: string;
  timestamp: Date;
}

interface AgentCrew {
  id: string;
  name: string;
  description: string;
  agents: string[];
  tasks: AgentTask[];
  messages: AgentMessage[];
  status: 'idle' | 'working' | 'completed' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

class AgentService {
  private ai: GoogleGenerativeAI | null = null;
  private crews: Map<string, AgentCrew> = new Map();
  private tasks: Map<string, AgentTask> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenerativeAI(apiKey);
    }
  }

  // Initialize AI agent with specific role and capabilities
  async initializeAgent(agent: Agent): Promise<void> {
    if (!this.ai) {
      throw new Error('AI service not available');
    }

    const systemPrompt = this.buildSystemPrompt(agent);
    
    // Store agent configuration
    const agentConfig = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      systemPrompt,
      aiConfig: agent.aiConfig,
      templates: agent.templates,
      specificFields: agent.specificFields
    };

    // Initialize agent in memory
    this.agents.set(agent.id, agentConfig);
  }

  // Create a crew of agents to work together
  async createCrew(name: string, description: string, agentIds: string[]): Promise<AgentCrew> {
    const crew: AgentCrew = {
      id: this.generateId(),
      name,
      description,
      agents: agentIds,
      tasks: [],
      messages: [],
      status: 'idle',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.crews.set(crew.id, crew);
    return crew;
  }

  // Assign a task to a crew
  async assignTaskToCrew(crewId: string, task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AgentTask> {
    const crew = this.crews.get(crewId);
    if (!crew) {
      throw new Error('Crew not found');
    }

    const newTask: AgentTask = {
      ...task,
      id: this.generateId(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    crew.tasks.push(newTask);
    crew.status = 'working';
    crew.updatedAt = new Date();
    this.tasks.set(newTask.id, newTask);

    // Start processing the task
    this.processCrewTask(crewId, newTask.id);
    
    return newTask;
  }

  // Process a task with the crew
  private async processCrewTask(crewId: string, taskId: string): Promise<void> {
    const crew = this.crews.get(crewId);
    const task = this.tasks.get(taskId);
    
    if (!crew || !task) {
      return;
    }

    try {
      task.status = 'in_progress';
      task.updatedAt = new Date();

      // Create a collaborative workspace for the crew
      const workspace = await this.createCrewWorkspace(crew, task);
      
      // Let agents collaborate on the task
      const result = await this.collaborateOnTask(crew, task, workspace);
      
      task.result = result;
      task.status = 'completed';
      task.updatedAt = new Date();
      
      crew.status = crew.tasks.every(t => t.status === 'completed') ? 'completed' : 'working';
      crew.updatedAt = new Date();

    } catch (error) {
      task.status = 'failed';
      task.result = { error: error instanceof Error ? error.message : 'Unknown error' };
      task.updatedAt = new Date();
      
      crew.status = 'error';
      crew.updatedAt = new Date();
    }
  }

  // Create a collaborative workspace for agents
  private async createCrewWorkspace(crew: AgentCrew, task: AgentTask): Promise<string> {
    const workspacePrompt = `
# Crew Workspace: ${crew.name}
## Task: ${task.description}
## Priority: ${task.priority}
## Type: ${task.type}

## Available Agents:
${crew.agents.map(agentId => {
  const agent = this.agents.get(agentId);
  return `- ${agent?.name}: ${agent?.description} (${agent?.category})`;
}).join('\n')}

## Collaboration Guidelines:
1. Each agent should contribute based on their expertise
2. Agents can ask questions to each other
3. Work together to achieve the best result
4. Consider the task priority and type
5. Provide actionable insights and recommendations

## Task Context:
${task.metadata ? JSON.stringify(task.metadata, null, 2) : 'No additional context provided'}

Please collaborate to complete this task effectively.
`;

    return workspacePrompt;
  }

  // Enable agents to collaborate on a task
  private async collaborateOnTask(crew: AgentCrew, task: AgentTask, workspace: string): Promise<any> {
    if (!this.ai) {
      throw new Error('AI service not available');
    }

    const model = this.ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Create a conversation for the crew
    const chat = model.startChat({
      history: crew.messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    // Add the workspace context
    const workspaceMessage: AgentMessage = {
      role: 'system',
      content: workspace,
      timestamp: new Date()
    };
    crew.messages.push(workspaceMessage);

    // Let agents take turns contributing
    const agentContributions = [];
    
    for (const agentId of crew.agents) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      const agentPrompt = `
You are ${agent.name}, a ${agent.category} specialist. 
Based on your expertise and the current task, provide your contribution:

${agent.systemPrompt}

Current task: ${task.description}
Task type: ${task.type}
Priority: ${task.priority}

Previous contributions: ${agentContributions.length > 0 ? agentContributions.join('\n\n') : 'None yet'}

Please provide your expert input to help complete this task.
`;

      try {
        const result = await chat.sendMessage(agentPrompt);
        const response = await result.response;
        const text = response.text();

        const contribution: AgentMessage = {
          role: 'agent',
          content: text,
          agentId,
          timestamp: new Date()
        };

        crew.messages.push(contribution);
        agentContributions.push(`${agent.name}: ${text}`);

      } catch (error) {
        console.error(`Error getting contribution from agent ${agent.name}:`, error);
      }
    }

    // Generate final result
    const finalPrompt = `
Based on all the agent contributions, provide a comprehensive final result for the task:

Task: ${task.description}
Type: ${task.type}

Agent Contributions:
${agentContributions.join('\n\n')}

Please synthesize all contributions into a coherent, actionable result.
`;

    try {
      const result = await chat.sendMessage(finalPrompt);
      const response = await result.response;
      const finalResult = response.text();

      const finalMessage: AgentMessage = {
        role: 'assistant',
        content: finalResult,
        timestamp: new Date()
      };

      crew.messages.push(finalMessage);
      return { result: finalResult, contributions: agentContributions };

    } catch (error) {
      throw new Error(`Failed to generate final result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate email content using agents
  async generateEmailContent(
    crewId: string,
    context: {
      recipient: string;
      purpose: string;
      tone: 'formal' | 'casual' | 'professional' | 'friendly';
      keyPoints: string[];
      attachments?: string[];
    }
  ): Promise<EmailData> {
    const task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
      type: 'email',
      description: `Generate email content for ${context.recipient} with purpose: ${context.purpose}`,
      priority: 'medium',
      metadata: context
    };

    const emailTask = await this.assignTaskToCrew(crewId, task);
    
    // Wait for task completion
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (emailTask.status === 'pending' || emailTask.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('Email generation timed out');
      }
    }

    if (emailTask.status === 'failed') {
      throw new Error(`Email generation failed: ${emailTask.result?.error || 'Unknown error'}`);
    }

    // Parse the result into EmailData format
    const result = emailTask.result?.result || '';
    
    // Extract subject and body from the result
    const subjectMatch = result.match(/Subject:\s*(.+)/i);
    const bodyMatch = result.match(/Body:\s*([\s\S]*)/i);
    
    const subject = subjectMatch?.[1]?.trim() || 'Generated Email';
    const body = bodyMatch?.[1]?.trim() || result;

    return {
      to: context.recipient,
      subject,
      body,
      isHtml: true,
      attachments: undefined
    };
  }

  // Generate contextual email content
  async generateContextualEmail(
    crewId: string,
    baseContent: EmailData,
    recipientMetadata: { name: string; company?: string; jobTitle?: string },
    usePhoneticName: boolean = false
  ): Promise<EmailData> {
    let phoneticName = recipientMetadata.name;
    if (usePhoneticName) {
      phoneticName = await this.getPhoneticName(crewId, recipientMetadata.name);
    }

    const taskDescription = `Rewrite the following email content to be highly personalized for the recipient.
Original Subject: ${baseContent.subject}
Original Body: ${baseContent.body}

Recipient Details:
- Name: ${recipientMetadata.name}
- Company: ${recipientMetadata.company || 'N/A'}
- Job Title: ${recipientMetadata.jobTitle || 'N/A'}
- Phonetic Name Variation: ${phoneticName}

Instructions:
1. Rewrite the subject line to be more engaging and personalized.
2. Rewrite the opening paragraph to directly address the recipient and their context.
3. If appropriate, subtly incorporate the phonetic name variation to build trust (e.g., mentioning a colleague with that name).
4. Rewrite the closing to be warm and context-aware.
5. Keep the core message of the email intact.
6. Return the result in the format:
Subject: [New Subject]
Body: [New Body]`;

    const task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
      type: 'email',
      description: taskDescription,
      priority: 'high',
      metadata: { baseContent, recipientMetadata }
    };

    const contextualTask = await this.assignTaskToCrew(crewId, task);

    await this.waitForTask(contextualTask);

    if (contextualTask.status === 'failed') {
      throw new Error(`Contextual email generation failed: ${contextualTask.result?.error || 'Unknown error'}`);
    }

    const result = contextualTask.result?.result || '';
    const subjectMatch = result.match(/Subject:\s*(.+)/i);
    const bodyMatch = result.match(/Body:\s*([\s\S]*)/i);

    const subject = subjectMatch?.[1]?.trim() || baseContent.subject;
    const body = bodyMatch?.[1]?.trim() || baseContent.body;

    return {
      ...baseContent,
      subject,
      body
    };
  }

  // Generate polymorphic templates
  async generatePolymorphicTemplates(
    crewId: string,
    baseTemplate: string,
    constraints: string,
    count: number = 10
  ): Promise<string[]> {
    const taskDescription = `Based on the following HTML template, generate ${count} distinct but semantically identical versions.

Base Template:
${baseTemplate}

Constraints:
- ${constraints}

Instructions:
1. Each version must be stylistically different but convey the same core message.
2. Modify sentence structure, tone, and phrasing.
3. Do not change the HTML structure or placeholders.
4. Return the result as a numbered list of HTML bodies.`;

    const task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
      type: 'content',
      description: taskDescription,
      priority: 'medium',
      metadata: { baseTemplate, constraints, count }
    };

    const polymorphicTask = await this.assignTaskToCrew(crewId, task);

    await this.waitForTask(polymorphicTask, 60);

    if (polymorphicTask.status === 'failed') {
      throw new Error(`Polymorphic template generation failed: ${polymorphicTask.result?.error || 'Unknown error'}`);
    }

    const result = polymorphicTask.result?.result || '';

    // Parse the numbered list of templates
    const templates = result.split(/^\d+\.\s/m).slice(1).map((t: string) => t.trim());

    if (templates.length === 0 && result.trim().length > 0) {
      throw new Error('Failed to parse polymorphic templates from AI response.');
    }

    return templates.length > 0 ? templates : [baseTemplate]; // Fallback to base template
  }

  // Get phonetic name variations
  async getPhoneticName(crewId: string, name: string): Promise<string> {
    const taskDescription = `Find the most common phonetic spelling or variation for the name "${name}".
Instructions:
1. Analyze the name and determine its likely origin and pronunciation.
2. Provide a common alternative spelling or a phonetically similar name.
3. Return only the name, with no additional text.`;

    const task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
      type: 'research',
      description: taskDescription,
      priority: 'low',
      metadata: { name }
    };

    const phoneticTask = await this.assignTaskToCrew(crewId, task);

    try {
      await this.waitForTask(phoneticTask, 20);
    } catch (error) {
      return name; // Timeout, return original name
    }

    if (phoneticTask.status === 'failed') {
      return name; // Failed, return original name
    }

    const result = phoneticTask.result?.result?.trim();
    return result && result.length > 1 ? result : name;
  }

  // Analyze content using agents
  async analyzeContent(
    crewId: string,
    content: string,
    analysisType: 'sentiment' | 'tone' | 'readability' | 'comprehensive'
  ): Promise<any> {
    const task: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
      type: 'analysis',
      description: `Analyze content for ${analysisType}`,
      priority: 'medium',
      metadata: { content, analysisType }
    };

    const analysisTask = await this.assignTaskToCrew(crewId, task);
    
    // Wait for completion
    let attempts = 0;
    const maxAttempts = 30;
    
    while (analysisTask.status === 'pending' || analysisTask.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('Content analysis timed out');
      }
    }

    if (analysisTask.status === 'failed') {
      throw new Error(`Content analysis failed: ${analysisTask.result?.error || 'Unknown error'}`);
    }

    return analysisTask.result;
  }

  // Get crew status and tasks
  async getCrewStatus(crewId: string): Promise<AgentCrew | null> {
    return this.crews.get(crewId) || null;
  }

  // Get all crews
  async getAllCrews(): Promise<AgentCrew[]> {
    return Array.from(this.crews.values());
  }

  // Get task status
  async getTaskStatus(taskId: string): Promise<AgentTask | null> {
    return this.tasks.get(taskId) || null;
  }

  // Build system prompt for an agent
  private buildSystemPrompt(agent: Agent): string {
    const basePrompt = `You are ${agent.name}, a specialized AI agent focused on ${agent.category}.
    
Your capabilities include:
${agent.specificFields.map(field => `- ${field.label}: ${field.type} input`).join('\n')}

Your expertise areas:
${agent.templates.map(template => `- ${template.name}: ${template.subject}`).join('\n')}

AI Configuration:
- Model: ${agent.aiConfig?.model || 'gpt-3.5-turbo'}
- Temperature: ${agent.aiConfig?.temperature || 0.7}
- Max Tokens: ${agent.aiConfig?.maxTokens || 2000}

${agent.aiConfig?.systemPrompt || ''}

Always provide helpful, accurate, and actionable responses based on your expertise.`;

    return basePrompt;
  }

  // Generate unique ID
  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Private helper to wait for task completion
  private async waitForTask(task: AgentTask, timeout: number = 30): Promise<void> {
    let attempts = 0;
    while (task.status === 'pending' || task.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      if (attempts >= timeout) {
        throw new Error(`Task timed out after ${timeout} seconds`);
      }
    }
  }

  // Private storage for agents
  private agents: Map<string, any> = new Map();
}

export const agentService = new AgentService();