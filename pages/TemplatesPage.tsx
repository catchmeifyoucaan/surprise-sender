import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { toast } from 'react-hot-toast';
import api from '../services/api';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
}

const TemplatesPage: React.FC = () => {
  const auth = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/email/templates');
        const payload = res.data?.data || res.data;
        setTemplates(Array.isArray(payload) ? payload : []);
      } catch (e) {
        toast.error('Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Manage Templates</h1>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={() => window.history.back()}>Back</Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Templates</h2>
              {isLoading ? (
                <div className="text-text-secondary">Loading...</div>
              ) : templates.length === 0 ? (
                <div className="text-text-secondary">No templates available.</div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedTemplate?.id === tpl.id ? 'bg-accent text-white' : 'bg-slate-800/50 hover:bg-slate-700/50 text-text-primary'
                      }`}
                      onClick={() => setSelectedTemplate(tpl)}
                    >
                      <div className="font-medium">{tpl.name}</div>
                      <div className="text-xs opacity-75 truncate">{tpl.subject}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-8">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Preview</h2>
              {!selectedTemplate ? (
                <div className="text-text-secondary">Select a template to preview.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-text-secondary">Name</div>
                    <div className="text-text-primary font-medium">{selectedTemplate.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary">Subject</div>
                    <div className="text-text-primary">{selectedTemplate.subject}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary">Body</div>
                    <div className="mt-2 p-4 rounded bg-slate-800/50 border border-slate-700 whitespace-pre-wrap text-text-primary">
                      {selectedTemplate.body}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;