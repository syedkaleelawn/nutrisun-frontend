import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_API_URL;
  if (directUrl && directUrl.startsWith('http')) {
    return directUrl.endsWith('/api') ? directUrl : `${directUrl.replace(/\/+$/, '')}/api`;
  }
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) {
    if (typeof window !== 'undefined') {
      const isTargetingLoopback = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
      const isHostRemoteOrLAN = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isTargetingLoopback && isHostRemoteOrLAN) {
        return 'https://nutrisun-backend-hirj.onrender.com/api';
      }
    }
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`;
  }

  // When deployed to production or loaded on Vercel preview/production domains
  if (
    process.env.NODE_ENV === 'production' ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
  ) {
    return 'https://nutrisun-backend-hirj.onrender.com/api';
  }

  return 'http://127.0.0.1:8080/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Request interceptor: Inject JWT token if available in localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nutrisun_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

import { triggerGlobalToast } from '@/context/ToastContext';

// Response interceptor: Handle 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server, and Network errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (typeof window !== 'undefined') {
      const status = error.response?.status;
      const data = error.response?.data;
      const serverMessage = data?.error || data?.message;

      if (!status) {
        // Network offline or server unreachable
        triggerGlobalToast(
          'error',
          'Unable to connect to NutriSun API. Please verify your internet connection.',
          'Connection Issue'
        );
      } else if (status === 401) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
          localStorage.removeItem('nutrisun_token');
          localStorage.removeItem('nutrisun_user');
          triggerGlobalToast(
            'warning',
            serverMessage || 'Your session has expired. Please sign in again.',
            'Session Expired'
          );
        }
      } else if (status === 403) {
        triggerGlobalToast(
          'error',
          serverMessage || 'Access restricted. You do not have permission to perform this action.',
          'Access Denied'
        );
      } else if (status === 404) {
        const url = error.config?.url || '';
        if (!url.includes('/health')) {
          triggerGlobalToast(
            'warning',
            serverMessage || 'Requested service or resource not found.',
            'Not Found'
          );
        }
      } else if (status >= 500) {
        triggerGlobalToast(
          'error',
          serverMessage || 'A server error occurred. Please retry shortly.',
          'Server Error'
        );
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Fetches a receipt file from the protected /uploads/receipts/:filename endpoint using
 * an Authorization: Bearer header and returns a temporary blob URL for in-page display.
 *
 * IMPORTANT: The caller is responsible for calling URL.revokeObjectURL(blobUrl) when
 * the URL is no longer needed to avoid memory leaks.
 *
 * @param receiptPath - The server-side path e.g. "/uploads/receipts/filename.jpg"
 * @returns A promise that resolves to a temporary blob: URL string, or null on failure.
 */
export async function fetchReceiptBlobUrl(receiptPath: string): Promise<string | null> {
  if (!receiptPath || typeof window === 'undefined') return null;
  const token = localStorage.getItem('nutrisun_token');
  if (!token) return null;

  try {
    let targetUrl = receiptPath.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (!targetUrl.startsWith('/')) {
        targetUrl = '/' + targetUrl;
      }
      // If API_BASE_URL is pointing directly to an external backend origin (not same-origin /api),
      // resolve the upload path against that backend origin so it reaches the Render server directly
      if (API_BASE_URL && API_BASE_URL.startsWith('http')) {
        const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
        const isTargetingLoopback = backendOrigin.includes('localhost') || backendOrigin.includes('127.0.0.1');
        const isHostRemote = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        if (!isTargetingLoopback || !isHostRemote) {
          targetUrl = `${backendOrigin}${targetUrl}`;
        }
      }
    }

    const response = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// TypeScript Models matching Golang backend contracts
export type Role = 'customer' | 'admin' | 'chef' | 'delivery';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type DietaryType = 'veg' | 'non_veg' | 'egg';
export type MealStatus = 'TAKE' | 'SKIPPED_ON_TIME' | 'SKIPPED_LATE' | 'REALLOCATED';
export type DeliveryStatus = 'PENDING' | 'DELIVERED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REJECTED';
export type SubscriptionStatus = 'PAYMENT_PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type RequestType = 'SKIP';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  name: string;
  phone: string;
  delivery_address: string;
  email?: string;
  role: Role;
  must_change_password?: boolean;
  credential_locked?: boolean;
  instructions_accepted?: boolean;
  instructions_accepted_at?: string;
  instructions_version?: string;
  created_at?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  days_count: number;
  price: number;
  shifts: string;
  meal_credits: number;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  payment_status: PaymentStatus;
  status: SubscriptionStatus;
  is_active: boolean;
  plan_snapshot_name: string;
  plan_snapshot_price: number;
  plan_snapshot_days: number;
  plan_snapshot_shifts: string;
  plan_snapshot_total_credits: number;
  selected_shifts?: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  payment_confirmed_at?: string;
  payment_record?: PaymentRecord;
  user?: User;
  plan?: SubscriptionPlan;
}

export interface PaymentRecord {
  id: number;
  subscription_id: number;
  user_id: number;
  amount: number;
  payment_method: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  transaction_ref?: string;
  proof_image_url?: string;
  uploaded_at?: string;
  confirmed_by_admin_id?: number;
  confirmed_at?: string;
  admin_notes?: string;
  notes?: string;
  created_at?: string;
}

export interface DailyMealLog {
  id: number;
  subscription_id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  status: MealStatus;
  delivery_status: DeliveryStatus;
  credit_deducted: boolean;
  delivered_at?: string;
  reallocated_to_log_id?: number;
  reallocated_from_log_id?: number;
  subscription?: UserSubscription;
}

export interface MenuItem {
  id: number;
  date: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  item_name: string;
  dietary_type: DietaryType;
  created_at?: string;
}

export interface ServiceRequest {
  id: number;
  user_id: number;
  subscription_id: number;
  request_type: RequestType;
  status: RequestStatus;
  daily_meal_log_id?: number;
  effective_date: string;
  meal_slot?: MealSlot;
  submission_time: string;
  is_on_time: boolean;
  decision_time?: string;
  decided_by_admin_id?: number;
  admin_notes?: string;
  created_at?: string;
  subscription?: UserSubscription;
  daily_meal_log?: DailyMealLog;
  user?: User;
}

export interface CreditTransaction {
  id: number;
  subscription_id: number;
  user_id: number;
  delta: number;
  balance_after: number;
  reason: string;
  notes?: string;
  created_at: string;
}

export interface PendingCountsResponse {
  payment_pending: number;
  skip_requests: number;
  total_pending: number;
}

export interface ShiftKitchenResponse {
  date: string;
  shift: MealSlot;
  total_portions: number;
  late_cancellations: number;
  menu_items: MenuItem[];
}

export interface DeliveryItem {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  meal_slot: MealSlot;
  quantity: number;
  schedule_status: 'SCHEDULED' | 'COMPLETED';
}

export interface DeliverySheetResponse {
  date: string;
  shift: MealSlot;
  total_meals: number;
  total_customers: number;
  deliveries: DeliveryItem[];
}

/**
 * Securely downloads a file from an authenticated API endpoint as a Blob.
 * Validates that response is binary data and not a JSON error.
 * Extracts the filename from Content-Disposition/File-Name or uses fallback.
 * Triggers browser download without exposing tokens in URLs.
 */
export async function downloadAuthenticatedFile(
  endpointUrl: string,
  params?: Record<string, string | number | boolean | undefined>,
  fallbackFilename: string = 'NutriSun_Export.xlsx'
): Promise<{ success: boolean; filename: string; error?: string }> {
  try {
    const response = await api.get(endpointUrl, {
      params,
      responseType: 'blob',
    });

    // Check if response is actually a JSON error returned as a blob
    const rawContentType = response.headers['content-type'];
    const contentType = typeof rawContentType === 'string' ? rawContentType : '';
    if (contentType.includes('application/json')) {
      const text = await (response.data as Blob).text();
      let errorMsg = 'Failed to generate file';
      try {
        const json = JSON.parse(text);
        errorMsg = json.error || json.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    // Determine filename
    let filename = fallbackFilename;
    const rawContentDisposition = response.headers['content-disposition'];
    const contentDisposition = typeof rawContentDisposition === 'string' ? rawContentDisposition : '';
    const rawCustomFileName = response.headers['file-name'];
    const customFileName = typeof rawCustomFileName === 'string' ? rawCustomFileName : '';

    if (customFileName) {
      filename = customFileName;
    } else if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    // Create object URL and trigger download
    const blob = new Blob([response.data], {
      type: contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (err: unknown) {
    let message = 'Download failed';
    const axiosErr = err as AxiosError;
    if (axiosErr.message) {
      message = axiosErr.message;
    }
    if (axiosErr.response) {
      if (axiosErr.response.status === 401) {
        message = 'Session expired or authorization required. Please log in again.';
      } else if (axiosErr.response.status === 403) {
        message = 'Admin access required to download this report.';
      } else if (axiosErr.response.data instanceof Blob) {
        try {
          const text = await axiosErr.response.data.text();
          const json = JSON.parse(text);
          message = json.error || json.message || message;
        } catch {}
      }
    }
    return { success: false, filename: fallbackFilename, error: message };
  }
}

export interface CustomerSalesItem {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  confirmed_sales: number;
  pending_amount: number;
  payments_count: number;
  active_plans: string;
  current_status: string;
}

export interface PaymentRecordDetail {
  id: number;
  subscription_id: number;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  plan_name: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_ref: string;
  created_at: string;
  confirmed_at: string;
  confirmed_by: string;
  admin_notes: string;
}

export interface DailySalesDetail {
  date: string;
  confirmed_amount: number;
  pending_amount: number;
  payments_count: number;
  payments: PaymentRecordDetail[];
}

export interface AnalyticsResponse {
  selected_month?: string;
  start_date?: string;
  end_date?: string;
  total_confirmed_sales: number;
  total_pending_amount?: number;
  confirmed_payment_count?: number;
  pending_payment_count?: number;
  total_delivered_meals: number;
  breakfast_delivered: number;
  lunch_delivered: number;
  dinner_delivered: number;
  customer_sales?: CustomerSalesItem[];
  daily_sales?: DailySalesDetail[];
  recent_payments?: PaymentRecordDetail[];
}

export interface CustomerSubscriptionDetail {
  id: number;
  plan_name: string;
  plan_price: number;
  selected_shifts: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  payment_confirmed_at: string;
  created_at: string;
}

export interface CustomerCreditSummary {
  available: number;
  used: number;
  total: number;
}

export interface CustomerActivityItem {
  id?: number;
  timestamp: string;
  event_type: string;
  action: string;
  status: string;
  affected_date: string;
  meal_shift: string;
  credit_change: string;
  actor: string;
  reason: string;
  subscription_id?: number;
}

export interface CustomerReportItem {
  id: number;
  name: string;
  phone: string;
  email: string;
  delivery_address: string;
  registered_date: string;
  current_status: string;
  active_plans: string;
  credit_balance: CustomerCreditSummary;
  subscriptions: CustomerSubscriptionDetail[];
  payment_history: PaymentRecordDetail[];
  activity_history: CustomerActivityItem[];
}

export interface ExtractedPreviewItem {
  date: string;
  meal_slot: MealSlot;
  item_name: string;
  dietary_type: DietaryType;
}

export interface UploadMenuResponse {
  message: string;
  days_imported: number;
  items_created: number;
  replaced_existing: boolean;
  uncertain_entries?: string[];
}

export interface UploadConflictResponse {
  requires_confirmation: boolean;
  existing_count: number;
  new_days_count: number;
  new_items_count: number;
  message: string;
  extracted_preview?: ExtractedPreviewItem[];
  uncertain_entries?: string[];
}

// Typed API Helpers
export const authApi = {
  register: (data: { name: string; phone: string; delivery_address: string; password: string; email?: string }) =>
    api.post<{ message: string; token: string; user: User }>('/auth/register', data),
  login: (data: { phone: string; password: string }) =>
    api.post<{ message: string; token: string; user: User }>('/auth/login', data),
  changePassword: (data: { current_password?: string; new_password: string; confirm_password?: string }) =>
    api.post<{ message: string }>('/auth/change-password', data),
  getMe: () =>
    api.get<{ user: User }>('/auth/me'),
};

export const customerApi = {
  getPlans: () =>
    api.get<{ plans: SubscriptionPlan[] }>('/plans'),
  buyPlan: (plan_id: number, selected_shifts?: string) =>
    api.post<{
      message: string;
      subscription_id: number;
      plan_name: string;
      selected_shifts?: string;
      amount: number;
      upi_id: string;
      payee_name: string;
      account_holder: string;
      qr_asset_path: string;
      instruction: string;
      upi_url: string;
      status: string;
    }>('/customer/buy-plan', { plan_id, selected_shifts }),
  submitPaymentProof: (subscriptionId: number, formData: FormData) =>
    api.post<{
      message: string;
      subscription_id: number;
      status: string;
      payment_status: string;
      proof_image_url?: string;
      transaction_ref?: string;
    }>(`/customer/subscriptions/${subscriptionId}/payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getSubscriptions: () =>
    api.get<{ count: number; subscriptions: UserSubscription[] }>('/customer/subscriptions'),
  getMyMeals: (params?: { date?: string; month?: string; year?: string }) =>
    api.get<{ count: number; meals: DailyMealLog[] }>('/customer/my-meals', { params }),
  requestSkip: (meal_log_id: number) =>
    api.post<{ message: string; request_id: number; is_on_time: boolean; status: string }>('/customer/requests/skip', { meal_log_id }),
  getRequests: () =>
    api.get<{ count: number; requests: ServiceRequest[] }>('/customer/requests'),
  getCredits: (params?: { subscription_id?: number }) =>
    api.get<{ count: number; transactions: CreditTransaction[] }>('/customer/credits', { params }),
  acceptInstructions: (data?: { version?: string }) =>
    api.post<{ message: string; instructions_accepted: boolean; instructions_version: string }>('/customer/accept-instructions', data || {}),
};

export const menuApi = {
  getMenu: (params?: { month?: string; year?: string }) =>
    api.get<{ month: string; year: string; count: number; menu: MenuItem[] }>('/menu', { params }),
  uploadMonthlyMenu: (formData: FormData, onProgress?: (percent: number) => void) =>
    api.post<UploadMenuResponse>('/admin/menu/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),
  getMenuTemplateUrl: (month: string, year: string) =>
    `${API_BASE_URL}/admin/menu/template?month=${month}&year=${year}`,
  downloadMenuTemplate: (month: string, year: string) =>
    downloadAuthenticatedFile('/admin/menu/template', { month, year }, `NutriSun_Menu_Template_${year}_${month}.xlsx`),
};

export const kitchenApi = {
  getTodayCount: (params?: { date?: string; shift?: MealSlot }) =>
    api.get<ShiftKitchenResponse>('/kitchen/today-count', { params }),
};

export const deliveryApi = {
  getSheet: (params: { date?: string; shift?: MealSlot }) =>
    api.get<DeliverySheetResponse>('/delivery/sheet', { params }),
};

export const adminApi = {
  getPendingCounts: () =>
    api.get<PendingCountsResponse>('/admin/pending-counts'),
  getSubscriptions: (params?: { status?: string; payment_status?: string }) =>
    api.get<{ count: number; subscriptions: UserSubscription[] }>('/admin/subscriptions', { params }),
  confirmPayment: (id: number, data: { start_date: string }) =>
    api.put<{ message: string; subscription: UserSubscription; scheduled_days: number; total_meals: number }>(`/admin/subscriptions/${id}/payment`, data),
  rejectPayment: (id: number, data?: { reason?: string }) =>
    api.put<{ message: string; subscription: UserSubscription }>(`/admin/subscriptions/${id}/payment/reject`, data || {}),
  getRequests: (params?: {
    type?: string;
    status?: string;
    date?: string;
    meal?: string;
    customer?: string;
    timing?: string;
    scope?: string;
  }) =>
    api.get<{ count: number; requests: ServiceRequest[] }>('/admin/requests', { params }),
  reallocate: (data: { original_meal_log_id: number; new_date: string; new_slot: MealSlot; reason?: string }) =>
    api.post<{ message: string; original_meal_id: number; new_meal_id: number; new_date: string; new_slot: MealSlot }>('/admin/reallocate', data),
  adjustCredits: (data: { subscription_id: number; delta: number; reason: string }) =>
    api.post<{ message: string; remaining_credits: number }>('/admin/adjust-credits', data),
  getCustomers: () =>
    api.get<{ count: number; customers: User[] }>('/admin/customers'),
  updateCustomerAddress: (id: number, data: { delivery_address: string }) =>
    api.put<{ message: string; user: User }>(`/admin/customers/${id}/address`, data),
  resetCustomerPassword: (id: number, data: { temporary_password: string }) =>
    api.post<{ message: string }>(`/admin/customers/${id}/reset-password`, data),
  getStaff: () =>
    api.get<{ staff: User[] }>('/admin/staff'),
  createStaff: (data: { name: string; phone: string; password: string; role: Role }) =>
    api.post<{ message: string; staff: User }>('/admin/staff', data),
  toggleStaffStatus: (id: number, data: { is_active: boolean }) =>
    api.put<{ message: string; id: number; is_active: boolean }>(`/admin/staff/${id}/status`, data),
  resetStaffPassword: (id: number, data: { temporary_password: string }) =>
    api.post<{ message: string; expires_at: string }>(`/admin/staff/${id}/reset-password`, data),
  getPlans: () =>
    api.get<{ plans: SubscriptionPlan[] }>('/admin/plans'),
  createPlan: (data: { name: string; days_count: number; price: number; shifts: string; meal_credits: number }) =>
    api.post<{ message: string; plan: SubscriptionPlan }>('/admin/plans', data),
  updatePlan: (id: number, data: { name: string; days_count: number; price: number; shifts: string; meal_credits: number }) =>
    api.put<{ message: string; plan: SubscriptionPlan }>(`/admin/plans/${id}`, data),
  archivePlan: (id: number) =>
    api.put<{ message: string; is_archived: boolean }>(`/admin/plans/${id}/archive`),
  createMenuItem: (data: { date: string; meal_slot: MealSlot; item_name: string; dietary_type: DietaryType }) =>
    api.post<{ message: string; item: MenuItem }>('/admin/menu', data),
  deleteMenuItem: (id: number) =>
    api.delete<{ message: string; id: number }>(`/admin/menu/${id}`),
  getAnalytics: (params?: { month?: string; start_date?: string; end_date?: string }) =>
    api.get<AnalyticsResponse>('/admin/analytics', { params }),
  getCustomerReports: (params?: { month?: string; start_date?: string; end_date?: string; search?: string; customer_id?: number }) =>
    api.get<{ count: number; customers: CustomerReportItem[] }>('/admin/analytics/customers', { params }),
  downloadExportExcel: (params?: { month?: string; report?: string; start_date?: string; end_date?: string }) => {
    const isMonthly = params?.report === 'monthly' || Boolean(params?.month);
    const fallback = isMonthly
      ? `NutriSun_Monthly_Report_${params?.month || 'Current'}.xlsx`
      : 'NutriSun_Business_Data.xlsx';
    return downloadAuthenticatedFile('/admin/export-excel', params, fallback);
  },
  getExportExcelUrl: () => `${API_BASE_URL}/admin/export-excel`,
};
