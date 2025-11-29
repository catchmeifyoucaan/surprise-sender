import { Router } from 'express';
import { validateRequest, asyncHandler, createApiResponse } from '../middleware/validation';
import type { ValidatedRequest } from '../middleware/validation';
import { AgentSchema } from '../validation/schemas';
import { authenticateJWT } from '../middleware/auth';
import { AppDataSource } from '../data-source';
import { Agent, SmtpConfiguration } from '../entities';
import { container } from '../container';

const router = Router();
const agentService = container.agentService;
const emailService = container.emailService;

router.use(authenticateJWT);

router.get('/', asyncHandler(async (req, res) => {
  const agentRepo = AppDataSource.getRepository(Agent);
  const agents = await agentRepo.find({
    where: { user: { id: req.user!.id } },
    order: { createdAt: 'DESC' }
  });
  res.json(createApiResponse(true, agents, undefined, 'Agents retrieved successfully'));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentRepo = AppDataSource.getRepository(Agent);
  const agent = await agentRepo.findOne({
    where: { id, user: { id: req.user!.id } }
  });

  if (!agent) {
    return res.status(404).json(createApiResponse(false, undefined, 'Agent not found'));
  }

  res.json(createApiResponse(true, agent, undefined, 'Agent retrieved successfully'));
}));

router.post('/',
  validateRequest(AgentSchema),
  asyncHandler(async (req: ValidatedRequest<any>, res) => {
    const agentData = req.validatedBody!;
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = agentRepo.create({
      ...agentData,
      user: req.user!
    });
    const savedAgent = await agentRepo.save(agent);

    await agentService.initializeAgent(savedAgent as unknown as Agent);
    res.status(201).json(createApiResponse(true, savedAgent, undefined, 'Agent created successfully'));
  })
);

router.put('/:id',
  validateRequest(AgentSchema.partial()),
  asyncHandler(async (req: ValidatedRequest<any>, res) => {
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
    await agentService.initializeAgent(updatedAgent);
    res.json(createApiResponse(true, updatedAgent, undefined, 'Agent updated successfully'));
  })
);

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const agentRepo = AppDataSource.getRepository(Agent);
  const agent = await agentRepo.findOne({
    where: { id, user: { id: req.user!.id } }
  });

  if (!agent) {
    return res.status(404).json(createApiResponse(false, undefined, 'Agent not found'));
  }

  await agentRepo.remove(agent);
  res.json(createApiResponse(true, undefined, undefined, 'Agent deleted successfully'));
}));

router.post('/crews', asyncHandler(async (req, res) => {
  const { name, description, agentIds } = req.body;
  const crew = await agentService.createCrew(name, description, agentIds);
  res.status(201).json(createApiResponse(true, crew, undefined, 'Crew created successfully'));
}));

router.get('/crews', asyncHandler(async (req, res) => {
  const crews = await agentService.getAllCrews();
  res.json(createApiResponse(true, crews, undefined, 'Crews retrieved successfully'));
}));

router.get('/crews/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const crew = await agentService.getCrewStatus(id);
  if (!crew) {
    return res.status(404).json(createApiResponse(false, undefined, 'Crew not found'));
  }
  res.json(createApiResponse(true, crew, undefined, 'Crew status retrieved successfully'));
}));

router.post('/crews/:id/tasks', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, description, priority, metadata } = req.body;
  const task = await agentService.assignTaskToCrew(id, { type, description, priority, metadata });
  res.status(201).json(createApiResponse(true, task, undefined, 'Task assigned successfully'));
}));

router.get('/tasks/:taskId', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await agentService.getTaskStatus(taskId);
  if (!task) {
    return res.status(404).json(createApiResponse(false, undefined, 'Task not found'));
  }
  res.json(createApiResponse(true, task, undefined, 'Task status retrieved successfully'));
}));

router.post('/send-generated', asyncHandler(async (req, res) => {
  const { crewId, context, recipients = [], asHtml = true, smtpConfigId } = req.body;
  const emailData = await agentService.generateEmailContent(crewId, context);
  emailData.isHtml = asHtml;

  const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
  let smtp: SmtpConfiguration | null = null;
  if (smtpConfigId) smtp = await smtpRepo.findOne({ where: { id: smtpConfigId } });
  if (!smtp) {
    const actives = await smtpRepo.find({ where: { isActive: true } as any, order: { lastValidated: 'DESC' } });
    smtp = actives[0] || null;
  }
  if (!smtp) return res.status(400).json(createApiResponse(false, undefined, 'No active SMTP available'));

  const results = [];
  for (const to of recipients) {
    const result = await emailService.sendEmail({ ...emailData, to }, smtp);
    results.push({ to, ...result });
  }
  res.json(createApiResponse(true, { generated: emailData, results }, undefined, 'Emails processed'));
}));

router.post('/generate-email', asyncHandler(async (req, res) => {
  const { crewId, context } = req.body;
  const emailData = await agentService.generateEmailContent(crewId, context);
  res.json(createApiResponse(true, emailData, undefined, 'Email content generated successfully'));
}));

router.post('/analyze-content', asyncHandler(async (req, res) => {
  const { crewId, content, analysisType } = req.body;
  const analysis = await agentService.analyzeContent(crewId, content, analysisType);
  res.json(createApiResponse(true, analysis, undefined, 'Content analysis completed successfully'));
}));

export default router;
