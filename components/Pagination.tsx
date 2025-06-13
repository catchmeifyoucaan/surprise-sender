import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <nav
      className={`
        flex items-center justify-between
        border-t border-gray-700 px-4 sm:px-0
        ${className}
      `}
    >
      <div className="flex w-0 flex-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            inline-flex items-center px-4 py-2 text-sm font-medium
            rounded-md
            ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-300 hover:bg-gray-700'
            }
          `}
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          <span className="ml-2">Previous</span>
        </button>
      </div>

      <div className="hidden md:flex">
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              inline-flex items-center px-4 py-2 text-sm font-medium
              ${
                page === currentPage
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {page}
          </button>
        ))}
      </div>

      <div className="flex w-0 flex-1 justify-end">
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            inline-flex items-center px-4 py-2 text-sm font-medium
            rounded-md
            ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-300 hover:bg-gray-700'
            }
          `}
        >
          <span className="mr-2">Next</span>
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination; 