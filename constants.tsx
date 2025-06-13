import React from 'react';
import { NavItem, Agent, EmailTemplate } from './types';

export const APP_NAME = "Surprise Sender";
export const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

// SVG Icons
export const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

export const ComposeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

export const TrackingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-.952l2.176.335a1.125 1.125 0 01.981 1.043l.336 2.176c.052.337.339.608.677.626l2.29.141c.549.033.992.501.952 1.043l-.335 2.176a1.125 1.125 0 01-1.043.981l-2.176-.335a1.125 1.125 0 00-.626.677l-.141 2.29c-.033.549-.501.992-1.043.952l-2.176-.335a1.125 1.125 0 01-.981-1.043l-.336-2.176a1.125 1.125 0 00-.677-.626l-2.29-.141a1.043 1.043 0 01-1.043-.952l.335-2.176a1.125 1.125 0 011.043-.981l2.176.335c.337.052.608.339.626.677l.141-2.29c.033-.549.501-.992 1.043-.952A1.125 1.125 0 009.594 3.94zM14.25 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 7.5l1.406-3.281 3.281-1.406L22.937 6l-1.406 3.281-3.281 1.406L15 7.5zM18.25 16.5l1.406 3.281 3.281 1.406L22.937 18l-1.406-3.281-3.281-1.406L15 16.5z" />
  </svg>
);

export const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

export const BulkEmailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
  </svg>
);

export const BulkSmsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443H21.75A2.25 2.25 0 0024 16.125V8.25A2.25 2.25 0 0021.75 6H2.25A2.25 2.25 0 000 8.25v4.501z" />
  </svg>
);

export const LoginIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M9 12l3 3m0 0l3-3m-3 3V3" />
  </svg>
);

export const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

export const AdminPanelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 12h9.75m-9.75 6h9.75M3.75 6H7.5m-3.75 6H7.5m-3.75 6H7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
);

export const AgentIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l2.25 2.25M13.5 11.25l-2.25 2.25M11.25 15l2.25-2.25M13.5 15l-2.25-2.25M7.5 15h9M7.5 9V6.75M16.5 9V6.75" />
  </svg>
);


export const HtmlIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5 0l-4.5 16.5" />
  </svg>
);

export const SaveDraftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.663V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.663L18.288 5.338A2.25 2.25 0 0016.138 3.75H15M12 12.75h.008v.008H12v-.008z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.135 0 .267.004.395.012a2.25 2.25 0 011.952 2.212L13.5 12.75H10.5L9.653 5.224A2.25 2.25 0 0111.605 3.012C11.733 3.004 11.865 3 12 3z" />
  </svg>
);

export const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.97L7.5 21a3 3 0 01-3-3L1.5 15a3 3 0 015.97-2.97L9 11.25m0-6.75a3 3 0 00-3-3m0 0a3 3 0 00-3 3m3-3v3.75m0-3.75H3.75m9.75 0v3.75m0-3.75h3.75m0 0a3 3 0 003-3m-3 3a3 3 0 00-3-3m0 0a3 3 0 00-3 3m3 3h9M3.75 9h3" />
  </svg>
);

export const HtmlBulkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75L5.25 12l-3-3.75M7.5 20.25h9M16.5 3.75l3 3.75-3 3.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25h18M3 15.75h18M9 3.75c.51.052 1.005.134 1.486.263A5.99 5.99 0 0115 3.75m0 16.5a5.99 5.99 0 01-4.514-.263C9.995 19.866 9.49 19.948 9 20.25M12 8.25v7.5" />
  </svg>
);

export const SupportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

export const UploadIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

export const SIDEBAR_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { name: 'Compose', path: '/compose', icon: <ComposeIcon /> },
  { name: 'AI Agents', path: '/agents', icon: <AgentIcon /> },
  { name: 'HTML Bulk Sender', path: '/html-bulk-sender', icon: <HtmlBulkIcon /> },
  { name: 'Bulk Email', path: '/bulk-email', icon: <BulkEmailIcon /> },
  { name: 'Bulk SMS', path: '/bulk-sms', icon: <BulkSmsIcon /> },
  { name: 'Tracking', path: '/tracking', icon: <TrackingIcon /> },
  { name: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { name: 'Support', path: '/support', icon: <SupportIcon /> },
];


// --- AGENT DEFINITIONS ---
export const MOCK_AGENTS: Agent[] = [ // "MOCK" here refers to the initial static data for agents.
  {
    id: 'agent-ceo-cfo',
    name: 'CEO / CFO Comms',
    description: 'Facilitate high-level financial communications, invoice and W-9 distribution.',
    category: 'Executive',
    icon: <AgentIcon />,
    specificFields: [
      { name: 'ceoName', label: 'CEO Name', type: 'text', placeholder: 'e.g., Jane Doe' },
      { name: 'cfoName', label: 'CFO Name', type: 'text', placeholder: 'e.g., John Smith' },
      { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'e.g., Innovatech Inc.' },
      { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', placeholder: 'e.g., INV-2024-001' },
      { name: 'invoicePdf', label: 'Invoice PDF', type: 'file', fileAccept: '.pdf', allowAIGeneration: true },
      { name: 'w9Pdf', label: 'W-9 Form PDF', type: 'file', fileAccept: '.pdf', allowAIGeneration: true },
    ],
    templates: [
      { id: 'cc-t1', name: 'Invoice & W-9 Submission', subject: 'Invoice {invoiceNumber} and W-9 Form from {companyName}', body: 'Dear {RecipientName},\n\nPlease find attached Invoice {invoiceNumber} and our W-9 form for your records.\n\nThis is for services rendered for {companyName}.\n\nBest regards,\n{ceoName}, CEO\n{cfoName}, CFO', dynamicPlaceholders: ['RecipientName', 'invoiceNumber', 'companyName', 'ceoName', 'cfoName'] },
      { id: 'cc-t2', name: 'Quarterly Financial Report', subject: 'Q{QuarterNumber} Financial Report for {companyName}', body: 'Dear Team,\n\nAttached is the Q{QuarterNumber} financial report for {companyName}, presented by {cfoName}.\n\nRegards,\n{ceoName}', dynamicPlaceholders: ['QuarterNumber', 'companyName', 'cfoName', 'ceoName'] },
      { id: 'cc-t3', name: 'Investment Update', subject: 'Investment Update: {ProjectName} Progress - {companyName}', body: 'Dear Stakeholders,\n\nAn update on the {ProjectName} project from {companyName}. We are pleased to report...\n\nSincerely,\n{ceoName}, CEO', dynamicPlaceholders: ['ProjectName', 'companyName', 'ceoName'] },
      { id: 'cc-t4', name: 'Board Meeting Minutes Request', subject: 'Request for Board Meeting Minutes - {Date}', body: 'Dear {cfoName},\n\nCould you please prepare and circulate the minutes for the board meeting held on {Date} for {companyName}?\n\nThanks,\n{ceoName}', dynamicPlaceholders: ['cfoName', 'Date', 'companyName', 'ceoName'] },
      { id: 'cc-t5', name: 'Urgent Financial Review', subject: 'URGENT: Financial Review Meeting Request - {companyName}', body: 'Hi {cfoName},\n\nI need to schedule an urgent meeting to review the latest financial projections for {companyName}.\nPlease let me know your availability.\n\nBest,\n{ceoName}', dynamicPlaceholders: ['cfoName', 'companyName', 'ceoName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-ceo-employee',
    name: 'CEO / Employee Comms',
    description: 'Internal communications from the CEO to employees.',
    category: 'Internal',
    icon: <AgentIcon />,
    specificFields: [
        { name: 'CEOName', label: 'CEO Name (for signature)', type: 'text', placeholder: 'e.g., Alex Ray' },
        { name: 'CompanyName', label: 'Company Name (for context)', type: 'text', placeholder: 'e.g., Synergy Corp' },
    ],
    templates: [
      { id: 'ce-t1', name: 'Company Milestone Achieved', subject: 'Celebrating a New Milestone at {CompanyName}!', body: 'Dear Team,\n\nI am thrilled to announce that we have achieved {MilestoneDetails} at {CompanyName}!\n\nThis is a testament to your hard work.\n\nBest,\n{CEOName}, CEO', dynamicPlaceholders: ['CompanyName', 'MilestoneDetails', 'CEOName'] },
      { id: 'ce-t2', name: 'Holiday Greetings', subject: 'Season\'s Greetings from {CEOName}', body: 'Dear Valued Employees of {CompanyName},\n\nWishing you and your families a wonderful holiday season.\n\nWarmly,\n{CEOName}', dynamicPlaceholders: ['CompanyName', 'CEOName'] },
      { id: 'ce-t3', name: 'Important Policy Update', subject: 'Important Update: New {PolicyName} Policy', body: 'Hello Team,\n\nPlease be advised of a new company policy regarding {PolicyName}, effective {EffectiveDate}.\n\nRegards,\n{CEOName}, CEO', dynamicPlaceholders: ['PolicyName', 'EffectiveDate', 'CEOName'] },
      { id: 'ce-t4', name: 'Welcome New Hires', subject: 'Welcome to the Team, {NewHireNames}!', body: 'Team,\n\nPlease join me in welcoming our newest members: {NewHireNames} to {DepartmentName} at {CompanyName}.\n\nBest,\n{CEOName}', dynamicPlaceholders: ['NewHireNames', 'DepartmentName', 'CompanyName', 'CEOName'] },
      { id: 'ce-t5', name: 'Town Hall Invitation', subject: 'Invitation: Company Town Hall with {CEOName} on {Date}', body: 'Hi Everyone,\n\nI\'d like to invite you to our upcoming company Town Hall on {Date} at {Time} in {LocationOrLink}.\n\nLooking forward to connecting,\n{CEOName}', dynamicPlaceholders: ['Date', 'Time', 'LocationOrLink', 'CEOName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-payroll',
    name: 'Payroll Processor (Type 1 & 2)',
    description: 'Handle payroll notifications and communications.',
    category: 'Finance/HR',
    icon: <AgentIcon />,
    specificFields: [
        { name: 'CompanyName', label: 'Company Name', type: 'text', placeholder: 'e.g., Payroll Services Inc.' },
    ],
    templates: [
      { id: 'pr-t1', name: 'Payslip Notification (Type 1)', subject: 'Your Payslip for {PayPeriod} is Available - {EmployeeName}', body: 'Dear {EmployeeName},\n\nYour payslip for the period {PayPeriod} is now available in the portal.\n\nRegards,\nPayroll Department, {CompanyName}', dynamicPlaceholders: ['PayPeriod', 'EmployeeName', 'CompanyName'] },
      { id: 'pr-t2', name: 'Payroll Discrepancy Alert (Type 2)', subject: 'Action Required: Payroll Discrepancy for {EmployeeName} - {PayPeriod}', body: 'Dear {EmployeeName},\n\nWe have identified a potential discrepancy in your payroll for {PayPeriod}. Please contact us to resolve.\n\nPayroll Team, {CompanyName}', dynamicPlaceholders: ['EmployeeName', 'PayPeriod', 'CompanyName'] },
      { id: 'pr-t3', name: 'Year-End Tax Form Ready', subject: 'Your {Year} Tax Document ({FormName}) is Ready - {CompanyName}', body: 'Hello {EmployeeName},\n\nYour {Year} {FormName} is now available for download.\n\nPayroll Department, {CompanyName}', dynamicPlaceholders: ['Year', 'FormName', 'EmployeeName', 'CompanyName'] },
      { id: 'pr-t4', name: 'Bonus Payment Notification', subject: 'Bonus Payment Confirmation - {EmployeeName}', body: 'Dear {EmployeeName},\n\nWe are pleased to inform you that your bonus payment of {Amount} has been processed.\n\nRegards,\nPayroll, {CompanyName}', dynamicPlaceholders: ['EmployeeName', 'Amount', 'CompanyName'] },
      { id: 'pr-t5', name: 'Payroll System Update', subject: 'Important: Upcoming Payroll System Maintenance on {Date}', body: 'Dear Employees,\n\nPlease note that our payroll system will undergo maintenance on {Date} from {StartTime} to {EndTime}.\n\nThank you,\nPayroll Team, {CompanyName}', dynamicPlaceholders: ['Date', 'StartTime', 'EndTime', 'CompanyName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-hr-employment',
    name: 'HR & Employment',
    description: 'Manage offer letters, policy updates, and internal HR comms.',
    category: 'HR',
    icon: <AgentIcon />,
    specificFields: [
      { name: 'CompanyName', label: 'Company Name (for signature/context)', type: 'text', placeholder: 'e.g., WeHire Group' },
      { name: 'HRManagerName', label: 'HR Manager Name', type: 'text', placeholder: 'e.g., Sarah Woods' },
    ],
    templates: [
      { id: 'hr-t1', name: 'Offer Letter', subject: 'Offer of Employment - {PositionTitle} at {CompanyName}', body: 'Dear {CandidateName},\n\nWe are pleased to offer you the position of {PositionTitle} at {CompanyName}. Your start date will be {StartDate} and your salary will be {Salary}.\n\nPlease find the detailed offer attached.\n\nSincerely,\n{HRManagerName}, HR Department, {CompanyName}', dynamicPlaceholders: ['PositionTitle', 'CompanyName', 'CandidateName', 'StartDate', 'Salary', 'HRManagerName'] },
      { id: 'hr-t2', name: 'Policy Update Memo', subject: 'Important: Update to Company Policy - {PolicyName}', body: 'Dear Employees,\n\nThis memo is to inform you of an update to our company policy regarding {PolicyName}, effective {EffectiveDate}.\nPlease review the attached document.\n\nRegards,\n{HRManagerName}, HR Department, {CompanyName}', dynamicPlaceholders: ['PolicyName', 'EffectiveDate', 'CompanyName', 'HRManagerName'] },
      { id: 'hr-t3', name: 'Interview Invitation', subject: 'Interview Invitation: {PositionTitle} at {CompanyName}', body: 'Dear {CandidateName},\n\nThank you for your interest in the {PositionTitle} position. We would like to invite you for an interview on {Date} at {Time}.\n\nBest,\n{HRManagerName}, HR Team, {CompanyName}', dynamicPlaceholders: ['PositionTitle', 'CompanyName', 'CandidateName', 'Date', 'Time', 'HRManagerName'] },
      { id: 'hr-t4', name: 'Performance Review Reminder', subject: 'Reminder: Your Performance Review is Scheduled for {Date}', body: 'Hi {EmployeeName},\n\nThis is a reminder that your performance review with {ManagerName} is scheduled for {Date} at {Time}.\n\nThanks,\nHR, {CompanyName}', dynamicPlaceholders: ['EmployeeName', 'ManagerName', 'Date', 'Time', 'CompanyName'] },
      { id: 'hr-t5', name: 'Employee Onboarding Welcome', subject: 'Welcome to {CompanyName}, {NewEmployeeName}!', body: 'Dear {NewEmployeeName},\n\nWelcome aboard! We are excited to have you join {CompanyName}. Your first day is {StartDate}.\n\nBest regards,\n{HRManagerName}, HR Team', dynamicPlaceholders: ['CompanyName', 'NewEmployeeName', 'StartDate', 'HRManagerName'] },
    ],
    drafts: [],
  },
  // ... other agents defined previously, ensure they also have dynamicPlaceholders in their templates ...
  {
    id: 'agent-oil-gas',
    name: 'Oil & Gas Operations',
    description: 'Communications for oil and gas sector operations.',
    category: 'Industry Specific',
    icon: <AgentIcon />,
    templates: [
      { id: 'og-t1', name: 'Daily Drilling Report', subject: 'Daily Drilling Report - Well {WellName} - {Date}', body: 'Team,\n\nAttached is the daily drilling report for Well {WellName}, dated {Date}.\n\nOperations Manager, {SiteName}', dynamicPlaceholders: ['WellName', 'Date', 'SiteName'] },
      { id: 'og-t2', name: 'Safety Alert', subject: 'SAFETY ALERT: {AlertType} at {Location}', body: 'All Personnel,\n\nURGENT SAFETY ALERT: We have a {AlertType} situation at {Location}. Please follow {ProcedureName} immediately.\n\nSafety Officer', dynamicPlaceholders: ['AlertType', 'Location', 'ProcedureName'] },
      { id: 'og-t3', name: 'Production Update', subject: 'Weekly Production Update - {FieldName} - Wk {WeekNumber}', body: 'Stakeholders,\n\nThe weekly production update for {FieldName} (Week {WeekNumber}) is attached.\n\nRegards,\n{ReportingManager}', dynamicPlaceholders: ['FieldName', 'WeekNumber', 'ReportingManager'] },
      { id: 'og-t4', name: 'Maintenance Schedule', subject: 'Maintenance Schedule Update - {EquipmentName} - {SiteName}', body: 'Team,\n\nThe maintenance for {EquipmentName} at {SiteName} is scheduled for {Date} from {StartTime} to {EndTime}.\n\nMaintenance Lead', dynamicPlaceholders: ['EquipmentName', 'SiteName', 'Date', 'StartTime', 'EndTime'] },
      { id: 'og-t5', name: 'Environmental Compliance Report', subject: 'Environmental Compliance Monthly Report - {FacilityName}', body: 'Regulatory Body,\n\nPlease find attached the monthly environmental compliance report for {FacilityName}.\n\nEnvironmental Officer, {CompanyName}', dynamicPlaceholders: ['FacilityName', 'CompanyName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-accounting-firm',
    name: 'Accounting Firm Client Comms',
    description: 'Client communications for accounting firms.',
    category: 'Professional Services',
    icon: <AgentIcon />,
    templates: [
      { id: 'af-t1', name: 'Tax Document Request', subject: 'Action Required: Documents for {TaxYear} Tax Preparation - {ClientName}', body: 'Dear {ClientName},\n\nTo prepare your {TaxYear} taxes, please provide the following documents by {DueDate}: {DocumentList}.\n\nThanks,\n{AccountantName}, {FirmName}', dynamicPlaceholders: ['TaxYear', 'ClientName', 'DueDate', 'DocumentList', 'AccountantName', 'FirmName'] },
      { id: 'af-t2', name: 'Financial Statement Delivery', subject: 'Your {Period} Financial Statements from {FirmName}', body: 'Dear {ClientName},\n\nYour financial statements for the period ending {PeriodEndData} are complete and attached.\n\nBest regards,\n{AccountantName}, {FirmName}', dynamicPlaceholders: ['Period', 'FirmName', 'ClientName', 'PeriodEndData', 'AccountantName'] },
      { id: 'af-t3', name: 'Tax Deadline Reminder', subject: 'REMINDER: Tax Filing Deadline is {DeadlineDate}', body: 'Hi {ClientName},\n\nA friendly reminder that the tax filing deadline is approaching on {DeadlineDate}.\n\nSincerely,\n{FirmName}', dynamicPlaceholders: ['ClientName', 'DeadlineDate', 'FirmName'] },
      { id: 'af-t4', name: 'Engagement Letter', subject: 'Engagement Letter for Services - {ClientName} & {FirmName}', body: 'Dear {ClientName},\n\nPlease find attached our engagement letter outlining the services we will provide for {ServiceDescription}.\n\nWe look forward to working with you,\n{PartnerName}, {FirmName}', dynamicPlaceholders: ['ClientName', 'FirmName', 'ServiceDescription', 'PartnerName'] },
      { id: 'af-t5', name: 'Consultation Follow-Up', subject: 'Following Up on Our Consultation - {ClientName}', body: 'Dear {ClientName},\n\nIt was a pleasure speaking with you on {ConsultationDate}. As discussed, {FollowUpAction}.\n\nRegards,\n{AccountantName}, {FirmName}', dynamicPlaceholders: ['ClientName', 'ConsultationDate', 'FollowUpAction', 'AccountantName', 'FirmName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-aging-report',
    name: 'Aging Report Sender',
    description: 'Send reminders for overdue invoices.',
    category: 'Finance/AR',
    icon: <AgentIcon />,
    templates: [
      { id: 'ar-t1', name: 'Invoice Overdue (1st Reminder)', subject: 'REMINDER: Invoice {InvoiceNumber} is Past Due - {CompanyName}', body: 'Dear {ClientContactName},\n\nThis is a friendly reminder that Invoice {InvoiceNumber} for {Amount} was due on {DueDate}. Please submit payment at your earliest convenience.\n\nThank you,\nAccounts Receivable, {YourCompanyName}', dynamicPlaceholders: ['InvoiceNumber', 'CompanyName', 'ClientContactName', 'Amount', 'DueDate', 'YourCompanyName'] },
      { id: 'ar-t2', name: 'Invoice Overdue (2nd Reminder)', subject: 'SECOND REMINDER: Invoice {InvoiceNumber} ({Amount}) Seriously Past Due - {CompanyName}', body: 'Dear {ClientContactName},\n\nWe are yet to receive payment for Invoice {InvoiceNumber} ({Amount}), due {DueDate}. Please make payment immediately to avoid service interruption.\n\nAccounts Receivable, {YourCompanyName}', dynamicPlaceholders: ['InvoiceNumber', 'Amount', 'CompanyName', 'ClientContactName', 'DueDate', 'YourCompanyName'] },
      { id: 'ar-t3', name: 'Final Notice Before Collection', subject: 'FINAL NOTICE: Invoice {InvoiceNumber} - Action Required - {CompanyName}', body: 'Dear {ClientContactName},\n\nInvoice {InvoiceNumber} ({Amount}) remains unpaid despite previous reminders. If payment is not received by {FinalDueDate}, this will be escalated to collections.\n\nSincerely,\n{ARManagerName}, {YourCompanyName}', dynamicPlaceholders: ['InvoiceNumber', 'CompanyName', 'ClientContactName', 'Amount', 'FinalDueDate', 'ARManagerName', 'YourCompanyName'] },
      { id: 'ar-t4', name: 'Payment Plan Offer', subject: 'Regarding Overdue Invoice {InvoiceNumber} - Payment Options for {CompanyName}', body: 'Dear {ClientContactName},\n\nWe understand circumstances can be challenging. Regarding overdue invoice {InvoiceNumber}, we are open to discussing a payment plan. Please contact us by {ResponseDate}.\n\nThank you,\n{ARSupportName}, {YourCompanyName}', dynamicPlaceholders: ['InvoiceNumber', 'CompanyName', 'ClientContactName', 'ResponseDate', 'ARSupportName', 'YourCompanyName'] },
      { id: 'ar-t5', name: 'Payment Received Confirmation', subject: 'Payment Confirmation for Invoice {InvoiceNumber} - {CompanyName}', body: 'Dear {ClientContactName},\n\nThis email confirms receipt of your payment for Invoice {InvoiceNumber}. Thank you for your business.\n\nBest regards,\nAccounts Receivable, {YourCompanyName}', dynamicPlaceholders: ['InvoiceNumber', 'CompanyName', 'ClientContactName', 'YourCompanyName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-bulk-outreach',
    name: 'Bulk Outreach Agent',
    description: 'For legitimate bulk marketing, newsletters, or notifications.',
    category: 'Marketing/Notifications',
    icon: <AgentIcon />,
    templates: [
      { id: 'bo-t1', name: 'Monthly Newsletter', subject: '{Month} Newsletter from {YourBrandName} - {CatchyHeadline}', body: 'Hi {SubscriberName},\n\nWelcome to our {Month} newsletter! This month: {Feature1}, {Feature2}.\nRead more: {Link}\n\nBest,\nThe {YourBrandName} Team', dynamicPlaceholders: ['Month', 'YourBrandName', 'CatchyHeadline', 'SubscriberName', 'Feature1', 'Feature2', 'Link'] },
      { id: 'bo-t2', name: 'New Product Launch', subject: '🚀 Introducing {ProductName} - The Future of {ProductCategory}!', body: 'Hello {CustomerName},\n\nGet ready! We\'re excited to launch {ProductName}, our innovative solution for {ProblemSolved}.\n\nDiscover more and get your early bird discount: {ProductLink}\n\nCheers,\n{YourBrandName}', dynamicPlaceholders: ['ProductName', 'ProductCategory', 'CustomerName', 'ProblemSolved', 'ProductLink', 'YourBrandName'] },
      { id: 'bo-t3', name: 'Special Promotion Alert', subject: '🎉 Limited Time Offer: {DiscountPercentage}% OFF on {SelectedProducts}!', body: 'Hi {ValuedCustomer},\n\nDon\'t miss out! For a limited time, enjoy {DiscountPercentage}% off on {SelectedProducts}.\nShop now: {PromoLink}\n\nHappy Shopping,\n{YourBrandName}', dynamicPlaceholders: ['DiscountPercentage', 'SelectedProducts', 'ValuedCustomer', 'PromoLink', 'YourBrandName'] },
      { id: 'bo-t4', name: 'Event Invitation', subject: 'You\'re Invited: {EventName} on {EventDate}', body: 'Dear {CommunityMemberName},\n\nJoin us for {EventName} on {EventDate} at {EventLocationOrLink}. We\'ll be discussing {EventTopic}.\n\nRSVP here: {RSVPLink}\n\nSee you there,\n{YourOrganizationName}', dynamicPlaceholders: ['EventName', 'EventDate', 'CommunityMemberName', 'EventLocationOrLink', 'EventTopic', 'RSVPLink', 'YourOrganizationName'] },
      { id: 'bo-t5', name: 'Service Update Notification', subject: 'Important Update Regarding Your {ServiceName} Account', body: 'Hello {UserName},\n\nWe\'re writing to inform you about an important update to {ServiceName} effective {UpdateDate}. {UpdateDetails}.\n\nFor more information, visit {LearnMoreLink}.\n\nThanks,\nThe {YourBrandName} Team', dynamicPlaceholders: ['ServiceName', 'UserName', 'UpdateDate', 'UpdateDetails', 'LearnMoreLink', 'YourBrandName'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-fb-ads-employment',
    name: 'Facebook Ads Employment Outreach',
    description: 'Craft messages for recruiting via Facebook Ads type language.',
    category: 'Recruitment',
    icon: <AgentIcon />,
    templates: [
      { id: 'fb-t1', name: 'Targeted Job Ad Intro', subject: 'Opportunity for {JobTitle} Professionals in {Location}!', body: 'Hi {CandidateFirstName}!\n\nSaw your profile and thought you might be a great fit for a {JobTitle} role we have at {CompanyName} in {Location}. We offer {Benefit1} and {Benefit2}.\n\nInterested in learning more? Reply or visit: {JobLink}\n\nBest,\n{RecruiterName}', dynamicPlaceholders: ['JobTitle', 'Location', 'CandidateFirstName', 'CompanyName', 'Benefit1', 'Benefit2', 'JobLink', 'RecruiterName'] },
      { id: 'fb-t2', name: 'Quick Apply Call to Action', subject: 'Quick Apply: {JobTitle} at {CompanyName} - Don\'t Miss Out!', body: 'Hey there! Your skills in {Skill1} & {Skill2} match our {JobTitle} opening at {CompanyName}.\n\nApply in 2 minutes: {QuickApplyLink}\n\nLooking for talent like you!\n{HiringManagerName}', dynamicPlaceholders: ['Skill1', 'Skill2', 'JobTitle', 'CompanyName', 'QuickApplyLink', 'HiringManagerName'] },
      { id: 'fb-t3', name: 'Company Culture Highlight', subject: 'Join a Thriving Team at {CompanyName} - Now Hiring {JobTitle}!', body: 'Are you passionate about {IndustryField}?\n\n{CompanyName} is known for its {CultureHighlight1} and {CultureHighlight2}. We\'re seeking a {JobTitle}.\n\nExplore openings: {CareersPageLink}\n\nWe\'re growing!\n{HRTeamName}', dynamicPlaceholders: ['IndustryField', 'CompanyName', 'CultureHighlight1', 'CultureHighlight2', 'JobTitle', 'CareersPageLink', 'HRTeamName'] },
      { id: 'fb-t4', name: 'Remote Work Opportunity', subject: 'REMOTE {JobTitle} Role - Work From Anywhere with {CompanyName}!', body: 'Hi {PotentialCandidateName},\n\nDreaming of a remote {JobTitle} position? {CompanyName} is hiring! We offer competitive pay and a flexible work environment.\n\nDetails & Application: {RemoteJobLink}\n\nThanks,\n{TalentAcquisitionLead}', dynamicPlaceholders: ['JobTitle', 'CompanyName', 'PotentialCandidateName', 'RemoteJobLink', 'TalentAcquisitionLead'] },
      { id: 'fb-t5', name: 'Urgent Hiring Message', subject: 'URGENT HIRING: {JobTitle} at {CompanyName} - Immediate Start!', body: 'Attention {TargetAudience}!\n\n{CompanyName} has an immediate opening for a {JobTitle}. If you have experience in {KeySkill}, we want to hear from you NOW.\n\nApply today: {UrgentJobLink}\n\nDon\'t wait!\n{RecruitmentTeam}', dynamicPlaceholders: ['TargetAudience', 'CompanyName', 'JobTitle', 'KeySkill', 'UrgentJobLink', 'RecruitmentTeam'] },
    ],
    drafts: [],
  },
  {
    id: 'agent-security-awareness',
    name: 'Security Awareness Simulation Agent',
    description: 'Simulate common phishing scenarios for training purposes.',
    category: 'Training/Security',
    icon: <AgentIcon />,
    templates: [
      { id: 'sa-t1', name: 'Fake Login Prompt (Training)', subject: 'TRAINING: Action Required - Verify Your Account Login', body: 'Dear {EmployeeName},\n\n(SIMULATION ONLY) Our system detected unusual activity. Please verify your login details immediately to secure your account: {FakeLoginLink}\n\nIf you suspect this is a simulation, DO NOT click. Report it.\n\nIT Security Training Team, {CompanyName}', dynamicPlaceholders: ['EmployeeName', 'FakeLoginLink', 'CompanyName'] },
      { id: 'sa-t2', name: 'Urgent Executive Request (Training)', subject: 'TRAINING: Urgent Request from {FakeCEOName}', body: 'Hi {EmployeeName},\n\n(SIMULATION ONLY) I need you to process an urgent payment of {Amount} to {FakeVendorName} by end of day. Details here: {FakePaymentLink}\n\nThis is time-sensitive. Do not share.\n\nThanks,\n{FakeCEOName} (Simulation)', dynamicPlaceholders: ['EmployeeName', 'FakeCEOName', 'Amount', 'FakeVendorName', 'FakePaymentLink'] },
      { id: 'sa-t3', name: 'Fake Invoice Attached (Training)', subject: 'TRAINING: Invoice {FakeInvoiceNum} Due from {FakeCompanyName}', body: 'Dear {EmployeeName},\n\n(SIMULATION ONLY) Please find attached invoice {FakeInvoiceNum} from {FakeCompanyName} for immediate payment.\n\nIf this looks suspicious, report it as part of your training.\n\nRegards,\n{FakeSenderName}\n(Simulation Accounts Payable)', dynamicPlaceholders: ['EmployeeName', 'FakeInvoiceNum', 'FakeCompanyName', 'FakeSenderName'] },
      { id: 'sa-t4', name: 'Password Expiry Notification (Training)', subject: 'TRAINING: Your Password for {FakeSystemName} Will Expire Soon', body: 'Hello {EmployeeName},\n\n(SIMULATION ONLY) Your password for {FakeSystemName} is set to expire in 24 hours. To update it, please click here: {FakePasswordResetLink}\n\nFailure to do so may result in account lockout.\n\nIT Support Simulation, {CompanyName}', dynamicPlaceholders: ['EmployeeName', 'FakeSystemName', 'FakePasswordResetLink', 'CompanyName'] },
      { id: 'sa-t5', name: 'Unusual Package Delivery (Training)', subject: 'TRAINING: Issue with Your Recent Package Delivery - {FakeTrackingID}', body: 'Dear Valued Customer (Simulation),\n\n(SIMULATION ONLY) There was an issue with the delivery of your package {FakeTrackingID}. To reschedule or update your address, please visit: {FakeDeliveryLink}\n\nCustomer Service Simulation, {CompanyName}', dynamicPlaceholders: ['FakeTrackingID', 'FakeDeliveryLink', 'CompanyName'] },
    ],
    drafts: [],
  },
];