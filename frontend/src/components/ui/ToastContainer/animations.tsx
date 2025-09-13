export const toastAnimationStyles = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out forwards;
  }
  
  .animate-slide-out-right {
    animation: slideOutRight 0.3s ease-in forwards;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;

export const ToastAnimationStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: toastAnimationStyles }} />
);