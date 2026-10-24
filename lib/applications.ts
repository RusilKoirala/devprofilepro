// Where an application stands, for each downloaded resume (exports.status, migration 0006).
export const APPLICATION_STATUSES = ["sent", "interviewing", "offer", "rejected", "no_response"] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  sent: "Sent",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  no_response: "No response",
}
