import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import { toast } from 'react-hot-toast';
import {
  SparklesIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  BeakerIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { generateTextSuggestion, isAiAvailable } from '../services/geminiService';
import { MOCK_AGENTS } from '../constants';
import { Agent as ImportedAgent, EmailData } from '../types';
import FileInput from '../components/common/FileInput';

type DocumentType = 'pdf' | 'html' | 'email';

interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  subject: string;
  body: string;
  isHtml?: boolean;
  dynamicPlaceholders?: string[];
  metadata?: {
    logo?: string;
    styles?: string;
    footer?: string;
    header?: string;
  };
}

type Agent = ImportedAgent & {
  drafts: EmailData[];
  documentTemplates?: DocumentTemplate[];
};

interface AgentCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const categories: AgentCategory[] = [
  {
    id: 'communication',
    name: 'Communication',
    description: 'Agents specialized in email and messaging',
    icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />
  },
  {
    id: 'content',
    name: 'Content',
    description: 'Agents for content creation and management',
    icon: <DocumentTextIcon className="w-5 h-5" />
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Agents for social media and engagement',
    icon: <UserGroupIcon className="w-5 h-5" />
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Agents for executive communications',
    icon: <UserGroupIcon className="w-5 h-5" />
  },
  {
    id: 'hr',
    name: 'HR',
    description: 'Agents for HR and employee communications',
    icon: <UserGroupIcon className="w-5 h-5" />
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Agents for financial communications',
    icon: <UserGroupIcon className="w-5 h-5" />
  }
];

const AgentsPage: React.FC = () => {
  const auth = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [newAgent, setNewAgent] = useState<Partial<Agent>>({
    name: '',
    description: '',
    category: '',
    specificFields: [],
    templates: [],
    drafts: [],
    documentTemplates: []
  });
  const [selectedDocumentTemplate, setSelectedDocumentTemplate] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (auth.user) {
      auth.logUserActivity(auth.user.id, 'Viewed AI Agents Page.');
      fetchAgents();
    }
  }, [auth]);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setAgents(data);
      } else {
        setAgents(MOCK_AGENTS);
      }
    } catch (error) {
      setAgents(MOCK_AGENTS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsEditing(false);
    setSelectedTemplate(null);
    setSelectedDocumentTemplate(null);
    setFieldValues({});
  };

  const handleAgentCreate = async () => {
    if (!newAgent.name || !newAgent.description || !newAgent.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });

      if (!response.ok) throw new Error('Failed to create agent');

      toast.success('Agent created successfully');
      setIsCreating(false);
      setNewAgent({
        name: '',
        description: '',
        category: '',
        specificFields: [],
        templates: [],
        drafts: [],
        documentTemplates: []
      });
      fetchAgents();
    } catch (error) {
      toast.error('Failed to create agent');
    }
  };

  const handleAgentUpdate = async () => {
    if (!selectedAgent) return;

    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedAgent)
      });

      if (!response.ok) throw new Error('Failed to update agent');

      toast.success('Agent updated successfully');
      setIsEditing(false);
      fetchAgents();
    } catch (error) {
      toast.error('Failed to update agent');
    }
  };

  const handleAgentDelete = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete agent');

      toast.success('Agent deleted successfully');
      setSelectedAgent(null);
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  const handleAiAssist = async (type: 'description' | 'template' | 'field', fieldName?: string) => {
    if (!isAiAvailable()) {
      toast.error('AI features are currently disabled');
      return;
    }

    setIsAiGenerating(true);
    try {
      let prompt = '';
      if (type === 'description') {
        prompt = `Generate a professional description for an AI agent named "${selectedAgent?.name || newAgent.name}" in the ${selectedAgent?.category || newAgent.category} category.`;
      } else if (type === 'template') {
        prompt = `Generate a professional email template for an AI agent in the ${selectedAgent?.category || newAgent.category} category. Include subject and body with dynamic placeholders.`;
      } else if (type === 'field' && fieldName) {
        prompt = `Generate a professional value for the field "${fieldName}" in the context of ${selectedAgent?.name || newAgent.name} agent.`;
      }

      const suggestion = await generateTextSuggestion(prompt);
      
      if (selectedAgent) {
        if (type === 'description') {
          setSelectedAgent({ ...selectedAgent, description: suggestion });
        } else if (type === 'template') {
          const [subject, ...bodyParts] = suggestion.split('\n\n');
          const body = bodyParts.join('\n\n');
          setSelectedAgent({
            ...selectedAgent,
            templates: [
              ...selectedAgent.templates,
              {
                id: Date.now().toString(),
                name: 'AI Generated Template',
                subject,
                body,
                dynamicPlaceholders: extractPlaceholders(body)
              }
            ]
          });
        } else if (type === 'field' && fieldName) {
          setFieldValues(prev => ({ ...prev, [fieldName]: suggestion }));
        }
      } else {
        if (type === 'description') {
          setNewAgent({ ...newAgent, description: suggestion });
        } else if (type === 'template') {
          const [subject, ...bodyParts] = suggestion.split('\n\n');
          const body = bodyParts.join('\n\n');
          setNewAgent({
            ...newAgent,
            templates: [
              ...(newAgent.templates || []),
              {
                id: Date.now().toString(),
                name: 'AI Generated Template',
                subject,
                body,
                dynamicPlaceholders: extractPlaceholders(body)
              }
            ]
          });
        } else if (type === 'field' && fieldName) {
          setFieldValues(prev => ({ ...prev, [fieldName]: suggestion }));
        }
      }
      toast.success('AI suggestion generated');
    } catch (error) {
      toast.error('Failed to generate AI suggestion');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const extractPlaceholders = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = selectedAgent?.templates.find(t => t.id === templateId);
    if (template) {
      setFieldValues({});
      template.dynamicPlaceholders?.forEach(placeholder => {
        setFieldValues(prev => ({ ...prev, [placeholder]: '' }));
      });
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleTemplateGenerate = () => {
    if (!selectedTemplate || !selectedAgent) return;

    const template = selectedAgent.templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    let subject = template.subject;
    let body = template.body;

    Object.entries(fieldValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    const draft: EmailData = {
      id: Date.now().toString(),
      subject,
      body,
      to: '',
      timestamp: new Date().toISOString()
    };

    setSelectedAgent({
      ...selectedAgent,
      drafts: [...selectedAgent.drafts, draft]
    });

    toast.success('Template generated successfully');
  };

  const handleDocumentTemplateSelect = (templateId: string) => {
    setSelectedDocumentTemplate(templateId);
    const template = selectedAgent?.documentTemplates?.find(t => t.id === templateId);
    if (template) {
      setFieldValues({});
      template.dynamicPlaceholders?.forEach(placeholder => {
        setFieldValues(prev => ({ ...prev, [placeholder]: '' }));
      });
    }
  };

  const generateDocument = async () => {
    if (!selectedDocumentTemplate || !selectedAgent) return;

    const template = selectedAgent.documentTemplates?.find(t => t.id === selectedDocumentTemplate);
    if (!template) return;

    setIsGeneratingDocument(true);
    try {
      let subject = template.subject;
      let body = template.body;

      // Replace placeholders with values
      Object.entries(fieldValues).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      // Generate document based on type
      let documentContent: string;
      let documentType: string;
      if (template.type === 'pdf') {
        // Call PDF generation service with form-specific options
        const response = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: template,
            data: fieldValues,
            metadata: {
              ...template.metadata,
              formType: template.name.toLowerCase().includes('w-9') ? 'w9' : 'custom',
              includeLogo: true,
              includeSignature: true,
              watermark: selectedAgent.name
            }
          })
        });
        if (!response.ok) throw new Error('Failed to generate PDF');
        const blob = await response.blob();
        documentContent = URL.createObjectURL(blob);
        documentType = 'application/pdf';
      } else if (template.type === 'html') {
        // Generate HTML with enhanced styling and logo
        documentContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                ${template.metadata?.styles || ''}
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo {
                  max-width: 200px;
                  height: auto;
                }
                .content {
                  margin: 20px 0;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  text-align: center;
                  font-size: 0.9em;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="header">
                ${template.metadata?.logo ? `<img src="${template.metadata.logo}" alt="Logo" class="logo">` : ''}
                <h1>${subject}</h1>
              </div>
              <div class="content">
                ${body}
              </div>
              <div class="footer">
                ${template.metadata?.footer || ''}
              </div>
            </body>
          </html>
        `;
        documentType = 'text/html';
      } else {
        documentContent = body;
        documentType = 'text/plain';
      }

      setDocumentPreview(documentContent);

      // Create draft with enhanced metadata
      const draft: EmailData = {
        id: Date.now().toString(),
        subject,
        body: documentContent,
        to: '',
        timestamp: new Date().toISOString(),
        metadata: {
          type: documentType,
          template: template.name,
          agent: selectedAgent.name,
          generatedAt: new Date().toISOString()
        }
      };

      setSelectedAgent({
        ...selectedAgent,
        drafts: [...selectedAgent.drafts, draft]
      });

      toast.success('Document generated successfully');
    } catch (error) {
      toast.error('Failed to generate document');
    } finally {
      setIsGeneratingDocument(false);
    }
  };

  const handleSendDocument = async (draft: EmailData) => {
    if (!selectedAgent) return;

    setIsSending(true);
    try {
      // First, convert the document to the appropriate format if needed
      let documentToSend = draft.body;
      if (draft.metadata?.type === 'text/html') {
        // Convert HTML to PDF for sending
        const response = await fetch('/api/convert-to-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: draft.body,
            metadata: draft.metadata
          })
        });
        if (!response.ok) throw new Error('Failed to convert document to PDF');
        const blob = await response.blob();
        documentToSend = URL.createObjectURL(blob);
      }

      // Send the document
      const response = await fetch('/api/send-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          draft: {
            ...draft,
            body: documentToSend
          }
        })
      });

      if (!response.ok) throw new Error('Failed to send document');

      toast.success('Document sent successfully');
    } catch (error) {
      toast.error('Failed to send document');
    } finally {
      setIsSending(false);
    }
  };

  const downloadDocument = (draft: EmailData) => {
    const blob = new Blob([draft.body], { type: draft.metadata?.type || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.subject}.${draft.metadata?.type === 'text/html' ? 'html' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredAgents = agents.filter(agent =>
    selectedCategory === 'all' || agent.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary flex items-center">
            <SparklesIcon className="w-8 h-8 mr-3 text-accent" />
            AI Agents
          </h1>
          <div className="flex items-center space-x-4">
            {!isAiAvailable() && (
              <div className="text-amber-400 text-sm">
                AI features are currently disabled. Configure API key in settings.
              </div>
            )}
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Agent
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Agent List */}
          <div className="col-span-4">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <Select
                  value={selectedCategory}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...categories.map(category => ({
                      value: category.id,
                      label: category.name
                    }))
                  ]}
                />
              </div>

              <div className="space-y-4">
                {filteredAgents.map(agent => (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id
                        ? 'bg-accent text-white'
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                    }`}
                    onClick={() => handleAgentSelect(agent)}
                  >
                    <h3 className="font-medium">{agent.name}</h3>
                    <p className="text-sm opacity-75 mt-1">
                      {agent.description.substring(0, 100)}...
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50">
                        {agent.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Details */}
          <div className="col-span-8">
            {selectedAgent ? (
              <div className="bg-primary rounded-lg shadow-lg p-6">
                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Name
                      </label>
                      <Input
                        value={selectedAgent.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedAgent({ ...selectedAgent, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-text-secondary">
                          Description
                        </label>
                        {isAiAvailable() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAiAssist('description')}
                            disabled={isAiGenerating}
                          >
                            <SparklesIcon className="w-4 h-4 mr-1" />
                            AI Assist
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={selectedAgent.description}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSelectedAgent({ ...selectedAgent, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Category
                      </label>
                      <Select
                        value={selectedAgent.category}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAgent({ ...selectedAgent, category: e.target.value })}
                        options={categories.map(category => ({
                          value: category.id,
                          label: category.name
                        }))}
                      />
                    </div>

                    {/* Specific Fields */}
                    {selectedAgent.specificFields && selectedAgent.specificFields.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-text-primary mb-4">
                          Specific Fields
                        </h3>
                        <div className="space-y-4">
                          {selectedAgent.specificFields.map(field => (
                            <div key={field.name}>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-text-secondary">
                                  {field.label}
                                </label>
                                {field.allowAIGeneration && isAiAvailable() && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAiAssist('field', field.name)}
                                    disabled={isAiGenerating}
                                  >
                                    <SparklesIcon className="w-4 h-4 mr-1" />
                                    AI Assist
                                  </Button>
                                )}
                              </div>
                              {field.type === 'textarea' ? (
                                <Textarea
                                  value={fieldValues[field.name] || ''}
                                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleFieldChange(field.name, e.target.value)}
                                  placeholder={field.placeholder}
                                  rows={4}
                                />
                              ) : field.type === 'file' ? (
                                <FileInput
                                  label={field.label}
                                  name={field.name}
                                  onFileSelect={(file) => handleFieldChange(field.name, typeof file === 'string' ? file : file ? file.name : '')}
                                  currentValue={fieldValues[field.name]}
                                  accept={field.fileAccept}
                                  buttonText="Upload File"
                                />
                              ) : (
                                <Input
                                  type="text"
                                  value={fieldValues[field.name] || ''}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange(field.name, e.target.value)}
                                  placeholder={field.placeholder}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Templates */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-text-primary">
                          Templates
                        </h3>
                        {isAiAvailable() && (
                          <Button
                            variant="secondary"
                            onClick={() => handleAiAssist('template')}
                            disabled={isAiGenerating}
                          >
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            Generate Template
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {selectedAgent.templates.map(template => (
                          <div
                            key={template.id}
                            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                          >
                            <h4 className="font-medium text-text-primary mb-2">
                              {template.name}
                            </h4>
                            <div className="text-sm text-text-secondary mb-2">
                              <strong>Subject:</strong> {template.subject}
                            </div>
                            <div className="text-sm text-text-secondary">
                              <strong>Body:</strong>
                              <pre className="mt-1 whitespace-pre-wrap">
                                {template.body}
                              </pre>
                            </div>
                            {template.dynamicPlaceholders && template.dynamicPlaceholders.length > 0 && (
                              <div className="mt-2">
                                <strong className="text-sm text-text-secondary">Placeholders:</strong>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {template.dynamicPlaceholders.map(placeholder => (
                                    <span
                                      key={placeholder}
                                      className="px-2 py-1 text-xs rounded-full bg-slate-700/50"
                                    >
                                      {placeholder}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Templates */}
                    {selectedAgent.documentTemplates && selectedAgent.documentTemplates.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-text-primary mb-4">
                          Document Templates
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedAgent.documentTemplates.map(template => (
                            <div
                              key={template.id}
                              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                                selectedDocumentTemplate === template.id
                                  ? 'bg-accent text-white'
                                  : 'bg-slate-800/50 hover:bg-slate-700/50'
                              }`}
                              onClick={() => handleDocumentTemplateSelect(template.id)}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{template.name}</h4>
                                <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50">
                                  {template.type.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm opacity-75 mt-1">
                                {template.subject}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document Fields */}
                    {selectedDocumentTemplate && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-text-primary mb-4">
                          Fill Document Fields
                        </h3>
                        <div className="space-y-4">
                          {selectedAgent.documentTemplates
                            ?.find(t => t.id === selectedDocumentTemplate)
                            ?.dynamicPlaceholders?.map(placeholder => (
                              <div key={placeholder}>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                  {placeholder}
                                </label>
                                <Input
                                  value={fieldValues[placeholder] || ''}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange(placeholder, e.target.value)}
                                  placeholder={`Enter ${placeholder.toLowerCase()}`}
                                />
                              </div>
                            ))}
                          <Button
                            onClick={generateDocument}
                            disabled={Object.values(fieldValues).some(v => !v) || isGeneratingDocument}
                          >
                            <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                            {isGeneratingDocument ? 'Generating...' : 'Generate Document'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Document Preview */}
                    {documentPreview && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-text-primary mb-4">
                          Document Preview
                        </h3>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                          <iframe
                            src={documentPreview}
                            className="w-full h-96 border-0"
                            title="Document Preview"
                          />
                        </div>
                      </div>
                    )}

                    {/* Drafts with Actions */}
                    {selectedAgent.drafts.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-text-primary mb-4">
                          Recent Drafts
                        </h3>
                        <div className="space-y-4">
                          {selectedAgent.drafts.map(draft => (
                            <div
                              key={draft.id}
                              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-text-primary">
                                  {draft.subject}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-text-secondary">
                                    {new Date(draft.timestamp).toLocaleString()}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadDocument(draft)}
                                  >
                                    <DocumentArrowDownIcon className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSendDocument(draft)}
                                    disabled={isSending}
                                  >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <pre className="text-sm text-text-secondary whitespace-pre-wrap">
                                {draft.body}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => setIsEditing(false)}
                      >
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAgentUpdate}
                      >
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-text-primary">
                          {selectedAgent.name}
                        </h2>
                        <p className="text-text-secondary mt-1">
                          {selectedAgent.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="secondary"
                          onClick={() => setIsEditing(true)}
                        >
                          <PencilIcon className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleAgentDelete(selectedAgent.id)}
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Template Selection */}
                    <div>
                      <h3 className="text-lg font-medium text-text-primary mb-4">
                        Select Template
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedAgent.templates.map(template => (
                          <div
                            key={template.id}
                            className={`p-4 rounded-lg cursor-pointer transition-colors ${
                              selectedTemplate === template.id
                                ? 'bg-accent text-white'
                                : 'bg-slate-800/50 hover:bg-slate-700/50'
                            }`}
                            onClick={() => handleTemplateSelect(template.id)}
                          >
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm opacity-75 mt-1">
                              {template.subject}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Template Fields */}
                    {selectedTemplate && (
                      <div>
                        <h3 className="text-lg font-medium text-text-primary mb-4">
                          Fill Template Fields
                        </h3>
                        <div className="space-y-4">
                          {selectedAgent.templates
                            .find(t => t.id === selectedTemplate)
                            ?.dynamicPlaceholders?.map(placeholder => (
                              <div key={placeholder}>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                  {placeholder}
                                </label>
                                <Input
                                  value={fieldValues[placeholder] || ''}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange(placeholder, e.target.value)}
                                  placeholder={`Enter ${placeholder.toLowerCase()}`}
                                />
                              </div>
                            ))}
                          <Button
                            onClick={handleTemplateGenerate}
                            disabled={Object.values(fieldValues).some(v => !v)}
                          >
                            <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                            Generate Draft
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : isCreating ? (
              <div className="bg-primary rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-6">
                  Create New Agent
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Name
                    </label>
                    <Input
                      value={newAgent.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAgent({ ...newAgent, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-text-secondary">
                        Description
                      </label>
                      {isAiAvailable() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAiAssist('description')}
                          disabled={isAiGenerating}
                        >
                          <SparklesIcon className="w-4 h-4 mr-1" />
                          AI Assist
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={newAgent.description}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewAgent({ ...newAgent, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Category
                    </label>
                    <Select
                      value={newAgent.category}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewAgent({ ...newAgent, category: e.target.value })}
                      options={categories.map(category => ({
                        value: category.id,
                        label: category.name
                      }))}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => setIsCreating(false)}
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAgentCreate}
                    >
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Create Agent
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-primary rounded-lg shadow-lg p-6 flex flex-col items-center justify-center text-center">
                <SparklesIcon className="w-16 h-16 text-accent mb-4" />
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Select an Agent
                </h2>
                <p className="text-text-secondary">
                  Choose an agent from the list to view its details and manage its settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;
