# Fix Loan Status UI and Dashboard Pending Requests

This plan addresses the UI differences between "Applied Loans" and "Active Loans" and fixes missing details on the Admin Dashboard for pending loan requests.

## Proposed Changes

## Proposed Changes

### 1. Update Database Schema (`prisma/schema.prisma` & Backend)
- Add an `isTopUp Boolean @default(false)` field to the `Loan` model in `prisma/schema.prisma` to persistently track top-up loans.
- Update `backend/src/controllers/sync.controller.ts` to ensure `isTopUp` is not stripped from incoming sync payloads during `CREATE` operations.
- Run `npx prisma db push` to apply the changes.

#### [MODIFY] prisma/schema.prisma
#### [MODIFY] backend/src/controllers/sync.controller.ts

### 2. Update MemberDashboard.tsx (Frontend)
- **75% Repayment Eligibility Rule**: When a member requests a loan, check if they already have an active loan for that fund type.
  - If they do, calculate the repayment ratio: `(expectedReturn - balance) / expectedReturn`.
  - If `repaymentRatio < 0.75`, deny the request with an error message: "You must repay at least 75% of your active loan before requesting a top-up."
  - If `repaymentRatio >= 0.75`, allow the request and mark the new loan payload with `isTopUp: true`.
- **Calculate Applied vs. Active Loans**: Separate the display of loans:
  - `appliedShareLoan`: Loans with status `PENDING` or `VERIFIED`.
  - `activeShareLoan`: Loans with status `APPROVED`.
- **UI Adjustments**: Expand the financial summary grids to 4 columns to include the "Applied Loan" card showing the balance of pending/verified loans.

#### [MODIFY] frontend/src/pages/MemberDashboard.tsx

### 3. Update Loans.tsx (Frontend) - Two-Step Approval & Editing
- **Top-Up Label**: Display a distinct "TOP UP" badge next to the member's name if `isTopUp` is true.
- **Two-Step Workflow**:
  - **Secretary Role**: Views `PENDING` loans. Can "Verify" (changes status to `VERIFIED`) or "Reject".
  - **Treasurer Role**: Views `VERIFIED` loans. Can "Grant" (changes status to `APPROVED`) or "Reject".
- **Edit Requested Amount**: When the Treasurer is granting the loan, they can edit the `principal` amount if the requested amount is greater than available funds. The system will recalculate the interest and total balance based on the new granted amount before saving.

#### [MODIFY] frontend/src/pages/Loans.tsx

### 4. Update Dashboard.tsx (Frontend)
- **Fix "N/A" Date Requested**: Display `loan.createdAt || loan.timestamp` to ensure dates show correctly.
- **Fix Missing Member Name**: Map `memberId` to the `fullname` from the locally fetched `membersList` array.
- **Top-Up Label**: Show the "TOP UP" badge in the Pending Loan Requests table if applicable.

#### [MODIFY] frontend/src/pages/Dashboard.tsx

## User Review Required
> [!IMPORTANT]  
> The plan assumes that "verified and granted" maps to the `APPROVED` loan status in the system, while `PENDING` and `VERIFIED` statuses map to "Applied Loans". Please confirm if this logic correctly reflects your cooperative's workflow.

## Verification Plan
1. Request a new loan as a member and verify it appears under "Applied Loan" and not "Active Loan".
2. Check the main Dashboard to ensure the Pending Loan Requests table correctly displays the "Date Requested" and "Member Name".
3. Approve the loan (via the backend/DB or appropriate dashboard) and verify that the member's "Applied Loan" drops to 0, and "Active Loan" populates with the granted amount.
