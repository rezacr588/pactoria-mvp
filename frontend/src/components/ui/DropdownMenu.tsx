import { Fragment, ReactNode } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { classNames } from '../../utils/classNames';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  badge?: string | number;
  disabled?: boolean;
}

export interface DropdownSection {
  id: string;
  title?: string;
  items: DropdownItem[];
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items?: DropdownItem[];
  sections?: DropdownSection[];
  width?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right';
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const widthClasses = {
  sm: 'w-48',
  md: 'w-64',
  lg: 'w-80',
  xl: 'w-96'
};

export default function DropdownMenu({
  trigger,
  items = [],
  sections = [],
  width = 'md',
  align = 'right',
  header,
  footer,
  className
}: DropdownMenuProps) {
  const allItems = sections.length > 0 ? sections : [{ id: 'default', items }];

  return (
    <Menu as="div" className="relative">
      <Menu.Button as="div">
        {trigger}
      </Menu.Button>
      
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className={classNames(
          'absolute z-10 mt-2 origin-top rounded-2xl bg-white dark:bg-secondary-900 shadow-strong ring-1 ring-black/5 dark:ring-white/5 focus:outline-none',
          widthClasses[width],
          align === 'right' ? 'right-0' : 'left-0',
          className
        )}>
          {header && (
            <div className="border-b border-neutral-100 dark:border-secondary-700">
              {header}
            </div>
          )}
          
          {allItems.map((section, sectionIndex) => (
            <div key={section.id}>
              {section.title && (
                <div className="px-4 py-2 border-b border-neutral-100 dark:border-secondary-700">
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-secondary-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
              )}
              
              <div className={sectionIndex === 0 && !header ? 'py-2' : sectionIndex === allItems.length - 1 && !footer ? 'py-2' : 'py-2'}>
                {section.items.map((item) => (
                  <Menu.Item key={item.id} disabled={item.disabled}>
                    {({ active }) => {
                      const content = (
                        <div className={classNames(
                          'flex items-center px-4 py-3 text-sm transition-colors',
                          item.disabled
                            ? 'text-neutral-400 dark:text-secondary-600 cursor-not-allowed'
                            : item.variant === 'danger'
                            ? active
                              ? 'bg-danger-50 dark:bg-danger-950/20 text-danger-700 dark:text-danger-400'
                              : 'text-danger-600 dark:text-danger-400'
                            : active
                            ? 'bg-neutral-50 dark:bg-secondary-800 text-neutral-900 dark:text-secondary-100'
                            : 'text-neutral-700 dark:text-secondary-300'
                        )}>
                          {item.icon && (
                            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                          )}
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className={classNames(
                              'ml-auto text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center',
                              item.variant === 'danger'
                                ? 'bg-danger-500 text-white'
                                : 'bg-primary-500 text-white'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );

                      if (item.href) {
                        return (
                          <a href={item.href} className="block">
                            {content}
                          </a>
                        );
                      }

                      return (
                        <button
                          onClick={item.onClick}
                          className="w-full text-left"
                          disabled={item.disabled}
                        >
                          {content}
                        </button>
                      );
                    }}
                  </Menu.Item>
                ))}
              </div>
              
              {sectionIndex < allItems.length - 1 && (
                <div className="border-t border-neutral-100 dark:border-secondary-700" />
              )}
            </div>
          ))}
          
          {footer && (
            <div className="border-t border-neutral-100 dark:border-secondary-700">
              {footer}
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}