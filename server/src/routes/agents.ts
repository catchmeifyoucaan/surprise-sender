import { Router, Request, Response } from 'express';
import { validateRequest, asyncHandler, createApiResponse } from '../middleware/validation';
import type { ValidatedRequest } from '../middleware/validation';
import { AgentSchema } from '../validation/schemas';
import { agentService } from '../services/agentService';
import { authenticateJWT } from '../middleware/auth';
import { AppDataSource } from '../data-source';
import { Agent } from '../entities';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get all agents
router.get('/',
  asyncHandler(async (req: Request, res: Response) => {
    const agentRepo = AppDataSource.getRepository(Agent);
    const agents = await agentRepo.find({
      where: { user: { id: req.user!.id } },
      order: { createdAt: 'DESC' }
    });
    
    return res.json(createApiResponse(true, agents, undefined, 'Agents retrieved successfully'));
  })
);

// Get agent by ID
router.get('/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({
      where: { id, user: { id: req.user!.id } }
    });
    
    if (!agent) {
      return res.status(404).json(createApiResponse(false, undefined, 'Agent not found'));
    }
    
    return res.json(createApiResponse(true, agent, undefined, 'Agent retrieved successfully'));
  })
);

// Create new agent
router.post('/',
  validateRequest(AgentSchema),
  asyncHandler(async (req: ValidatedRequest<any>, res: Response) => {
    const agentData = req.validatedBody!;
    
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = agentRepo.create({
      ...agentData,
      user: req.user!
    });
    
    const savedAgent = await agentRepo.save(agent);
    
    // Initialize the agent in the service
    await agentService.initializeAgent(savedAgent as unknown as Agent);
    
    return res.status(201).json(createApiResponse(true, savedAgent, undefined, 'Agent created successfully'));
  })
);

// Update agent
router.put('/:id',
  validateRequest(AgentSchema.partial()),
  asyncHandler(async (req: ValidatedRequest<any>, res: Response) => {
    const { id } = req.params;
    const updateData = req.validatedBody!;
    
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({
      where: { id, user: { id: req.user!.id } }
    });
    
    if (!agent) {
      return res.status(404).json(createApiResponse(false, undefined, 'Agent not found'));
    }
    
    Object.assign(agent, updateData);
    const updatedAgent = await agentRepo.save(agent);
    
    // Re-initialize the agent in the service
    await agentService.initializeAgent(updatedAgent);
    
    return res.json(createApiResponse(true, updatedAgent, undefined, 'Agent updated successfully'));
  })
);

// Delete agent
router.delete('/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({
      where: { id, user: { id: req.user!.id } }
    });
    
    if (!agent) {
      return res.status(404).json(createApiResponse(false, undefined, 'Agent not found'));
    }
    
    await agentRepo.remove(agent);
    
    return res.json(createApiResponse(true, undefined, undefined, 'Agent deleted successfully'));
  })
);

// Create crew
router.post('/crews',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, agentIds } = req.body;
    
    if (!name || !description || !agentIds || !Array.isArray(agentIds)) {
      return res.status(400).json(createApiResponse(false, undefined, 'Missing required fields'));
    }
    
    try {
      const crew = await agentService.createCrew(name, description, agentIds);
      return res.status(201).json(createApiResponse(true, crew, undefined, 'Crew created successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to create crew'));
    }
  })
);

// Get all crews
router.get('/crews',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const crews = await agentService.getAllCrews();
      return res.json(createApiResponse(true, crews, undefined, 'Crews retrieved successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to get crews'));
    }
  })
);

// Get crew status
router.get('/crews/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const crew = await agentService.getCrewStatus(id);
      if (!crew) {
        return res.status(404).json(createApiResponse(false, undefined, 'Crew not found'));
      }
      return res.json(createApiResponse(true, crew, undefined, 'Crew status retrieved successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to get crew status'));
    }
  })
);

// Assign task to crew
router.post('/crews/:id/tasks',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, description, priority, metadata } = req.body;
    
    if (!type || !description || !priority) {
      return res.status(400).json(createApiResponse(false, undefined, 'Missing required fields'));
    }
    
    try {
      const task = await agentService.assignTaskToCrew(id, {
        type,
        description,
        priority,
        metadata
      });
      return res.status(201).json(createApiResponse(true, task, undefined, 'Task assigned successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to assign task'));
    }
  })
);

// Get task status
router.get('/tasks/:taskId',
  asyncHandler(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    
    try {
      const task = await agentService.getTaskStatus(taskId);
      if (!task) {
        return res.status(404).json(createApiResponse(false, undefined, 'Task not found'));
      }
      return res.json(createApiResponse(true, task, undefined, 'Task status retrieved successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to get task status'));
    }
  })
);

// Generate email content using agents
router.post('/generate-email',
  asyncHandler(async (req: Request, res: Response) => {
    const { crewId, context } = req.body;
    
    if (!crewId || !context) {
      return res.status(400).json(createApiResponse(false, undefined, 'Missing required fields'));
    }
    
    try {
      const emailData = await agentService.generateEmailContent(crewId, context);
      return res.json(createApiResponse(true, emailData, undefined, 'Email content generated successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to generate email content'));
    }
  })
);

// Analyze content using agents
router.post('/analyze-content',
  asyncHandler(async (req: Request, res: Response) => {
    const { crewId, content, analysisType } = req.body;
    
    if (!crewId || !content || !analysisType) {
      return res.status(400).json(createApiResponse(false, undefined, 'Missing required fields'));
    }
    
    try {
      const analysis = await agentService.analyzeContent(crewId, content, analysisType);
      return res.json(createApiResponse(true, analysis, undefined, 'Content analysis completed successfully'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to analyze content'));
    }
  })
);

export default router;