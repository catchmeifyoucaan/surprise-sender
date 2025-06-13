import React from 'react';
import PageHeader from './PageHeader';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: {
    label: string;
    href?: string;
  }[];
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  children,
  className = ''
}) => {
  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      <div className="bg-gray-800 rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
};

export default PageContainer; 