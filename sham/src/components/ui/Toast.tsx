import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const ToastIcon = ({ type }: { type: Toast["type"] }) => {
  const iconClass = "h-5 w-5 no-flip";

  switch (type) {
    case "success":
      return <CheckCircle className={cn(iconClass, "text-green-500")} />;
    case "error":
      return <XCircle className={cn(iconClass, "text-red-500")} />;
    case "warning":
      return <AlertCircle className={cn(iconClass, "text-yellow-500")} />;
    default:
      return <AlertCircle className={cn(iconClass, "text-blue-500")} />;
  }
};

const ToastItem = ({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const bgColor = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  }[toast.type];

  return (
    <div
      className={cn(
        "flex items-center p-3 rounded-lg border shadow-lg transition-all duration-300",
        "animate-in slide-in-from-top-2 backdrop-blur-sm",
        bgColor
      )}
    >
      <ToastIcon type={toast.type} />
      <div className="mr-3 flex-1 min-w-0">
        <div className="font-medium text-gray-900 arabic-spacing text-sm">
          {toast.title}
          {toast.message && (
            <span className="text-gray-600 font-normal mr-2">
              {toast.message}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
      >
        <X className="h-4 w-4 no-flip" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast Container - Top Center */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 max-w-md w-full px-4">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
