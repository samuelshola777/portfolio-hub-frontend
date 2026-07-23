export type WorkspaceType = "PORTFOLIO" | "BUSINESS";

export type EntitlementCode =
  | "PAGES"
  | "SECTIONS"
  | "PRODUCTS"
  | "MUSIC_TRACKS"
  | "TEAM_MEMBERS"
  | "STORAGE_MB"
  | "EMAIL_TEMPLATES"
  | "MONTHLY_EMAILS"
  | "VIDEO_BACKGROUNDS"
  | "CUSTOM_DOMAIN"
  | "ADVANCED_ANIMATIONS"
  | "REMOVE_BRANDING"
  | "CART_ORDERS"
  | "WHATSAPP_ORDERS";

export type PlanEntitlement = {
  code: EntitlementCode;
  name: string;
  valueType: "BOOLEAN" | "INTEGER" | "DECIMAL" | "TEXT";
  value: string;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description?: string;
  workspaceType: WorkspaceType;
  monthlyPrice: number;
  currency: string;
  free: boolean;
  active: boolean;
  publicVisible: boolean;
  entitlements: PlanEntitlement[];
};

export type UsageItem = {
  code: EntitlementCode;
  name: string;
  valueType: PlanEntitlement["valueType"];
  used?: number;
  limit?: number;
  enabled?: boolean;
  unlimited: boolean;
};

export type WorkspaceUsage = {
  workspaceType: WorkspaceType;
  workspaceId: string;
  planName: string;
  usage: UsageItem[];
};

export type WorkspaceSubscription = {
  id: string;
  workspaceType: WorkspaceType;
  workspaceId: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  startedAt: string;
  nextBillingAt?: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  plan: SubscriptionPlan;
};

export type PaymentMethod = "PAYSTACK" | "BANK_TRANSFER";
export type PaymentStatus =
  | "INITIALIZED"
  | "PENDING_REVIEW"
  | "PAID"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
};

export type BillingPayment = {
  id: string;
  reference: string;
  workspaceType: WorkspaceType;
  workspaceId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  authorizationUrl?: string | null;
  transferProofUrl?: string | null;
  transferSenderName?: string | null;
  transferNote?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  paidAt?: string | null;
  bankAccount?: BankAccount | null;
  plan: SubscriptionPlan;
};

export type BillingPage = {
  items: BillingPayment[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};
