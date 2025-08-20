import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  children?: MenuItem[];
}

interface MenuProps {
  items: MenuItem[];
  trigger: React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
}

const Menu: React.FC<MenuProps> = ({
  items,
  trigger,
  className = '',
  placement = 'bottom',
  align = 'start',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setActiveSubmenu(null);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;

    if (item.children && item.children.length > 0) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
    } else {
      if (item.onClick) {
        item.onClick();
      }
      setIsOpen(false);
      setActiveSubmenu(null);
    }
  };

  const getPlacementClasses = () => {
    const baseClasses = 'absolute z-50 min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1';
    
    switch (placement) {
      case 'top':
        return `${baseClasses} bottom-full mb-2`;
      case 'bottom':
        return `${baseClasses} top-full mt-2`;
      case 'left':
        return `${baseClasses} right-full mr-2`;
      case 'right':
        return `${baseClasses} left-full ml-2`;
      default:
        return `${baseClasses} top-full mt-2`;
    }
  };

  const getAlignClasses = () => {
    switch (align) {
      case 'center':
        return 'left-1/2 transform -translate-x-1/2';
      case 'end':
        return 'right-0';
      default:
        return 'left-0';
    }
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    if (item.divider) {
      return <hr key={item.id} className="my-1 border-gray-200" />;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeSubmenu === item.id;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={`
            w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
            ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}
            ${level > 0 ? 'pl-8' : ''}
            ${hasChildren ? 'flex items-center justify-between' : ''}
          `}
          onMouseEnter={() => {
            if (hasChildren && level === 0) {
              setActiveSubmenu(item.id);
            }
          }}
        >
          <div className="flex items-center space-x-2">
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          {hasChildren && (
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
          )}
        </button>

        {hasChildren && isActive && (
          <div className={`absolute ${level === 0 ? 'left-full top-0 ml-1' : 'left-full top-0 ml-1'}`}>
            <div className="min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <div ref={triggerRef} onClick={handleTriggerClick}>
        {trigger}
      </div>

      {isOpen && (
        <div className={`${getPlacementClasses()} ${getAlignClasses()}`}>
          {items.map(item => renderMenuItem(item))}
        </div>
      )}
    </div>
  );
};

export default Menu; 