// Feature requests: small tasks designers want Trade Side to take off their plate.

export const FEATURE_REQUEST_LIMITS = { task: 2000, currentProcess: 2000 };

export type FeatureRequestStatus = "new" | "planned" | "building" | "shipped" | "not_planned";

export interface FeatureRequest {
  id: string;
  email: string;
  task: string;
  current_process: string;
  status: FeatureRequestStatus;
  created_at: string;
}

export const FEATURE_REQUEST_STATUS: Record<FeatureRequestStatus, string> = {
  new: "Received",
  planned: "Planned",
  building: "Being built",
  shipped: "Shipped",
  not_planned: "Not planned",
};
