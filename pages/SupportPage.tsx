import React, { useState, ChangeEvent, FormEvent } from 'react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Textarea from '../components/common/Textarea';
import { toast } from 'react-hot-toast';
import {
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  VideoCameraIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const SupportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('faq');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqCategories = [
    {
      name: 'Getting Started',
      icon: <AcademicCapIcon className="w-5 h-5" />,
      questions: [
        {
          question: 'How do I set up my first SMTP configuration?',
          answer: 'To set up your first SMTP configuration, go to the Settings page and upload a CSV or JSON file containing your SMTP details. The system will automatically validate the configurations and save the valid ones.'
        },
        {
          question: 'What file formats are supported for SMTP configurations?',
          answer: 'We support both CSV and JSON formats. The CSV should have columns for host, port, user, and pass. The JSON should be an array of objects with the same fields.'
        }
      ]
    },
    {
      name: 'AI Features',
      icon: <BookOpenIcon className="w-5 h-5" />,
      questions: [
        {
          question: 'How do I enable AI features?',
          answer: 'To enable AI features, you need to configure your API key in the Settings page. Once configured, you can use AI-powered features like content generation and optimization.'
        },
        {
          question: 'What AI models are supported?',
          answer: 'We currently support Gemini Pro for text generation and optimization. More models will be added in future updates.'
        }
      ]
    },
    {
      name: 'Campaign Management',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      questions: [
        {
          question: 'How do I track campaign performance?',
          answer: 'Campaign performance can be tracked through the Dashboard page, which shows metrics like open rates, click-through rates, and delivery status.'
        },
        {
          question: 'Can I schedule campaigns?',
          answer: 'Yes, you can schedule campaigns for future delivery. When creating a campaign, you can set the desired delivery date and time.'
        }
      ]
    }
  ];

  const handleContactSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });

      if (!response.ok) throw new Error('Failed to submit contact form');

      toast.success('Message sent successfully');
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Support Center</h1>
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={() => window.open('https://docs.surprise-sender.com', '_blank')}
            >
              View Documentation
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-3">
            <div className="bg-primary rounded-lg shadow-lg p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('faq')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'faq' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <QuestionMarkCircleIcon className="w-5 h-5" />
                  <span>FAQ</span>
                </button>
                <button
                  onClick={() => setActiveTab('contact')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'contact' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  <span>Contact Support</span>
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'docs' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>Documentation</span>
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'videos' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <VideoCameraIcon className="w-5 h-5" />
                  <span>Video Tutorials</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              {/* FAQ Section */}
              {activeTab === 'faq' && (
                <div className="space-y-8">
                  {faqCategories.map((category) => (
                    <div key={category.name} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        {category.icon}
                        <h2 className="text-xl font-semibold text-text-primary">
                          {category.name}
                        </h2>
                      </div>
                      <div className="space-y-4">
                        {category.questions.map((faq, index) => (
                          <div
                            key={index}
                            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                          >
                            <h3 className="text-lg font-medium text-text-primary mb-2">
                              {faq.question}
                            </h3>
                            <p className="text-text-secondary">
                              {faq.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact Form */}
              {activeTab === 'contact' && (
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-xl font-semibold text-text-primary mb-6">
                    Contact Support
                  </h2>
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Name"
                        id="name"
                        name="name"
                        value={contactForm.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                      <Input
                        label="Email"
                        id="email"
                        name="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <Input
                      label="Subject"
                      id="subject"
                      name="subject"
                      value={contactForm.subject}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                    <Textarea
                      label="Message"
                      id="message"
                      name="message"
                      value={contactForm.message}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={6}
                      required
                    />
                    <div className="flex items-center space-x-4">
                      <label className="text-sm text-text-primary">Priority:</label>
                      <select
                        value={contactForm.priority}
                        onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-text-primary"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Sending...' : 'Send Message'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Documentation */}
              {activeTab === 'docs' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    Documentation
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-lg font-medium text-text-primary mb-4">
                        Quick Start Guide
                      </h3>
                      <ul className="space-y-3 text-text-secondary">
                        <li>1. Configure your SMTP settings</li>
                        <li>2. Set up your AI preferences</li>
                        <li>3. Create your first campaign</li>
                        <li>4. Monitor performance</li>
                      </ul>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                      <h3 className="text-lg font-medium text-text-primary mb-4">
                        API Reference
                      </h3>
                      <ul className="space-y-3 text-text-secondary">
                        <li>Authentication</li>
                        <li>Campaign Management</li>
                        <li>Analytics</li>
                        <li>Webhooks</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Tutorials */}
              {activeTab === 'videos' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    Video Tutorials
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="aspect-video bg-slate-700 rounded-lg mb-4"></div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">
                        Getting Started with Surprise Sender
                      </h3>
                      <p className="text-text-secondary">
                        Learn the basics of setting up and using Surprise Sender
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="aspect-video bg-slate-700 rounded-lg mb-4"></div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">
                        Advanced Campaign Management
                      </h3>
                      <p className="text-text-secondary">
                        Master advanced features for campaign optimization
                      </p>
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

export default SupportPage;
