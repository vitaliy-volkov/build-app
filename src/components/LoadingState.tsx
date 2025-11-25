import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  isLoading: boolean;
  hasError: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  isLoading, 
  hasError, 
  error, 
  onRetry, 
  children 
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Загрузка данных...</h3>
        <p className="text-gray-500 text-center">
          Пожалуйста, подождите. Мы загружаем информацию с сервера.
        </p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
        <p className="text-red-500 text-center mb-4">
          {error || 'Произошла ошибка при загрузке данных. Пожалуйста, попробуйте еще раз.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Повторить попытку
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({ 
  size = 'md', 
  text = 'Загрузка...' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      <span className="text-sm">{text}</span>
    </div>
  );
};

interface ErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-red-800 font-medium">Ошибка</h4>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
