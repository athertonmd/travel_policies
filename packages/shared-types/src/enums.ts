/**
 * Shared enumerations derived from Data Model Specification and Business Rules.
 */

/** Enterprise/Tenant status */
export type EntityStatus = 'Active' | 'Suspended' | 'Archived';

/** User roles (Data Model Specification) */
export type UserRole = 'SystemAdmin' | 'TMCAdmin' | 'Reviewer' | 'ReadOnly';

/** Policy document statuses (Data Model Specification) */
export type PolicyDocumentStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Review'
  | 'Approved'
  | 'Rejected';

/** Policy rule categories (BR-016) */
export type PolicyCategory = 'Air' | 'Hotel' | 'Rail' | 'Car' | 'General';

/** Change types for policy comparison (BR-026) */
export type ChangeType = 'Added' | 'Removed' | 'Modified';

/** Review actions (BR-020) */
export type ReviewAction = 'Approve' | 'Modify' | 'Reject';
