import { toast } from 'sonner';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-right',
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'bottom-right',
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'bottom-right',
    });
  },

  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'bottom-right',
    });
  },
};

/**
 * Extract error message from API response
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.response?.statusText) {
    return error.response.statusText;
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};
