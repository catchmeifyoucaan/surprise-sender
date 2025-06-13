import React, { useState, useEffect } from 'react';
import { SmtpConfiguration } from '../types';
import { EmailService } from '../services/emailService';
import Button from './common/Button';
import LoadingSpinner from './common/LoadingSpinner';

interface SmtpValidatorProps {
  smtpConfigs: SmtpConfiguration[];
  onValidationComplete: (validConfigs: SmtpConfiguration[], invalidConfigs: { config: SmtpConfiguration; error: string }[]) => void;
}

const SmtpValidator: React.FC<SmtpValidatorProps> = ({ smtpConfigs, onValidationComplete }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validConfigs, setValidConfigs] = useState<SmtpConfiguration[]>([]);
  const [invalidConfigs, setInvalidConfigs] = useState<{ config: SmtpConfiguration; error: string }[]>([]);
  const [showInvalidConfigs, setShowInvalidConfigs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset states when smtpConfigs changes
  useEffect(() => {
    setValidConfigs([]);
    setInvalidConfigs([]);
    setProgress(0);
    setError(null);
  }, [smtpConfigs]);

  const handleValidate = async () => {
    if (smtpConfigs.length === 0) {
      setError('No SMTP configurations to validate');
      return;
    }

    setIsValidating(true);
    setProgress(0);
    setValidConfigs([]);
    setInvalidConfigs([]);
    setError(null);

    try {
      console.log('Starting validation of', smtpConfigs.length, 'SMTP configurations');
      const result = await EmailService.validateSmtpConfig(smtpConfigs);
      
      if (result.success) {
        console.log('Validation completed:', {
          valid: result.valid,
          invalid: result.invalid,
          total: result.total
        });
        
        // Update local state
        setValidConfigs(result.validConfigs || []);
        setInvalidConfigs(result.invalidConfigs || []);
        setProgress(100);
        
        // Update parent component with valid configurations
        if (result.validConfigs && result.validConfigs.length > 0) {
          console.log('Updating parent with valid configs:', result.validConfigs.length);
          onValidationComplete(result.validConfigs, result.invalidConfigs || []);
        } else {
          console.log('No valid configurations to update');
        }
      } else {
        console.error('Validation failed:', result.error);
        setError(result.error || 'Validation failed');
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      setError(error.message || 'An error occurred during validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteInvalid = () => {
    setInvalidConfigs([]);
    onValidationComplete(validConfigs, []);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          onClick={handleValidate}
          disabled={isValidating || smtpConfigs.length === 0}
          className="w-32"
        >
          {isValidating ? <LoadingSpinner /> : 'Validate SMTPs'}
        </Button>
        
        {invalidConfigs.length > 0 && (
          <Button
            onClick={() => setShowInvalidConfigs(!showInvalidConfigs)}
            variant="secondary"
            className="w-40"
          >
            {showInvalidConfigs ? 'Hide Dead SMTPs' : 'Show Dead SMTPs'}
          </Button>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      {isValidating && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 text-center">
            Validating SMTPs... {progress}%
          </div>
        </div>
      )}

      {!isValidating && (validConfigs.length > 0 || invalidConfigs.length > 0) && (
        <div className="text-sm text-gray-600">
          <p>Valid SMTPs: {validConfigs.length}</p>
          <p>Invalid SMTPs: {invalidConfigs.length}</p>
        </div>
      )}

      {showInvalidConfigs && invalidConfigs.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Dead SMTPs</h3>
            <Button
              onClick={handleDeleteInvalid}
              variant="danger"
              className="w-32"
            >
              Delete All
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invalidConfigs.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{item.config.host}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.config.user}</td>
                    <td className="px-4 py-2 text-sm text-red-600">{item.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmtpValidator; 