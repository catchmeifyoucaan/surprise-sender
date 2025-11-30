import { AgentService } from '../src/services/agentService';
import { Agent } from '../src/entities';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock GoogleGenerativeAI
jest.mock('@google/generative-ai');
const mockedGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;

describe('AgentService', () => {
  let agentService: AgentService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    agentService = new AgentService();
  });

  it('should create a crew', async () => {
    const crew = await agentService.createCrew('Test Crew', 'This is a test crew', ['1', '2']);
    expect(crew.name).toBe('Test Crew');
    expect(crew.agents).toEqual(['1', '2']);
  });

  it('should assign a task to a crew', async () => {
    const crew = await agentService.createCrew('Test Crew', 'This is a test crew', ['1', '2']);
    const task = await agentService.assignTaskToCrew(crew.id, {
      type: 'email',
      description: 'Test Task',
      priority: 'medium',
    });
    expect(task.description).toBe('Test Task');
  });
});
