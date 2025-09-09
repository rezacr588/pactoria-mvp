// Common UI component prop interfaces for consistency

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

export interface FormComponentProps extends BaseComponentProps {
  name?: string;
  value?: unknown;
  onChange?: (value: unknown) => void;
  onBlur?: (event: React.FocusEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export interface SizeVariant {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface ColorVariant {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';
}

export interface LoadingState {
  loading?: boolean;
  loadingText?: string;
}

export interface ErrorState {
  error?: string | null;
  showError?: boolean;
}

// Button component props
export interface ButtonProps extends InteractiveComponentProps, SizeVariant, ColorVariant, LoadingState {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  pulse?: boolean;
  gradient?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

// Input component props
export interface InputProps extends FormComponentProps, SizeVariant {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onIconClick?: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
}

// Select component props
export interface SelectProps extends FormComponentProps, SizeVariant {
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
    group?: string;
  }>;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  emptyText?: string;
  loadingText?: string;
}

// Modal component props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  centered?: boolean;
  footer?: React.ReactNode;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

// Card component props
export interface CardProps extends BaseComponentProps, SizeVariant {
  title?: string;
  subtitle?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

// Badge component props
export interface BadgeProps extends BaseComponentProps, SizeVariant, ColorVariant {
  dot?: boolean;
  count?: number;
  showZero?: boolean;
  overflowCount?: number;
  status?: 'success' | 'processing' | 'default' | 'error' | 'warning';
  text?: string;
}

// Toast/Notification props
export interface ToastProps extends BaseComponentProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  closable?: boolean;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Loading component props
export interface LoadingProps extends BaseComponentProps, SizeVariant {
  spinning?: boolean;
  tip?: string;
  delay?: number;
  indicator?: React.ReactNode;
}

// Dropdown component props
export interface DropdownProps extends BaseComponentProps {
  trigger?: 'hover' | 'click' | 'contextMenu';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  overlay: React.ReactNode;
  disabled?: boolean;
  arrow?: boolean;
  overlayClassName?: string;
}

// Table component props
export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
}

export interface TableProps<T = Record<string, unknown>> extends BaseComponentProps {
  columns: TableColumn<T>[];
  dataSource: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    onChange?: (page: number, pageSize: number) => void;
  };
  rowKey?: string | ((record: T) => string);
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  scroll?: { x?: number | string; y?: number | string };
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  showHeader?: boolean;
  sticky?: boolean;
}

// Form component props
export interface FormProps extends BaseComponentProps {
  layout?: 'horizontal' | 'vertical' | 'inline';
  labelCol?: { span?: number; offset?: number };
  wrapperCol?: { span?: number; offset?: number };
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  onValuesChange?: (changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => void;
  initialValues?: Record<string, unknown>;
  validateTrigger?: 'onChange' | 'onBlur' | 'onSubmit';
  disabled?: boolean;
}

// Navigation component props
export interface NavigationItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  children?: NavigationItem[];
  disabled?: boolean;
  badge?: number | string;
}

export interface NavigationProps extends BaseComponentProps {
  items: NavigationItem[];
  mode?: 'horizontal' | 'vertical' | 'inline';
  theme?: 'light' | 'dark';
  selectedKeys?: string[];
  openKeys?: string[];
  onSelect?: (selectedKeys: string[]) => void;
  onOpenChange?: (openKeys: string[]) => void;
  collapsed?: boolean;
  collapsible?: boolean;
}

// Layout component props
export interface LayoutProps extends BaseComponentProps {
  hasSider?: boolean;
}

export interface SiderProps extends BaseComponentProps {
  collapsed?: boolean;
  collapsible?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  width?: number | string;
  collapsedWidth?: number | string;
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  onBreakpoint?: (broken: boolean) => void;
  theme?: 'light' | 'dark';
  trigger?: React.ReactNode;
  reverseArrow?: boolean;
}

export interface HeaderProps extends BaseComponentProps {
  style?: React.CSSProperties;
}

export interface ContentProps extends BaseComponentProps {
  style?: React.CSSProperties;
}

export interface FooterProps extends BaseComponentProps {
  style?: React.CSSProperties;
}
