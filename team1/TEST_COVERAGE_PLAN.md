# MediConnect Test Coverage Strategy & Implementation Plan

## Current Status
- Unit Tests: Partial (Auth, Prescriptions, Security)
- Integration Tests: Partial (Supertest vs in-memory Mongo)
- E2E Tests: Missing
- Frontend Tests: Missing (only default `App.test.js`)
- Overall Coverage: ~35% (Estimated)

## Target Coverage
- Backend: 80%+
- Frontend: 70%+
- Critical Paths (Auth, Booking, Payments): 95%+

## Test Implementation Plan

### 1. Unit Tests (Backend)
**Files to Create/Expand:**
- `backend/tests/appointments.test.js`
  - Test double-booking prevention (unique index).
  - Test timezone normalization.
  - Test offline appointment approval validation (missing clinic address).
- `backend/tests/reports.test.js`
  - Test IDOR prevention (Patient A cannot delete Patient B's report).
  - Test file cleanup on deletion.
- `backend/tests/chatbot.test.js`
  - Test intent extraction JSON parsing.
  - Test fallback on Ollama timeout.

### 2. Integration Tests (Backend)
**Files to Create/Expand:**
- `backend/tests/flows/appointment-flow.test.js`
  - Full lifecycle: Book -> Pending -> Approve -> Scheduled -> Complete.
  - Verify Socket.io events are emitted (mocked).
- `backend/tests/flows/registration-flow.test.js`
  - Test geocoding fallback when Nominatim fails.

### 3. Frontend Tests (React)
**Tools:** Jest + React Testing Library
**Files to Create:**
- `frontend/src/components/patient/MyAppointments/MyAppointments.test.js`
  - Test loading state rendering.
  - Test filter application (Today, This Week).
  - Test Google Maps URL generation.
- `frontend/src/components/patient/Reports/Reports.test.js`
  - Test delete confirmation modal trigger.

### 4. End-to-End (E2E) Tests
**Tool:** Cypress or Playwright
**Files to Create:**
- `cypress/e2e/appointment-booking.cy.js`
  - Simulate patient login, find doctor, book slot, verify UI update.
- `cypress/e2e/chatbot-intent.cy.js`
  - Type natural language, verify route navigation.

## Execution Commands
```bash
# Backend
npm run test:coverage

# Frontend
npm run test:coverage

# E2E
npx cypress run
```