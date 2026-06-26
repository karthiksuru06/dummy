# MEDviz
**A Comprehensive AI-Powered Telemedicine & Triage Platform**

**DOCUMENT TYPE**: Project Report
**ORGANISATION**: [Insert Organisation]

---

## TABLE OF CONTENTS
01. Executive Summary & Problem Statement
02. Project Overview & Objectives
03. Proposed Solution & Key Features
04. High-Level System Architecture
05. Frontend Architecture & Flowchart
06. Backend Architecture & Flowchart
07. Database Architecture & ER Diagram
08. Technology Stack
09. API Documentation
10. Code Implementation Guide
11. Additional Features
12. Future Scope & Roadmap
13. System Design Considerations
14. Setup & Deployment Instructions

---

## 01 Executive Summary & Problem Statement

### 1.1 Executive Summary
The MEDviz platform is an AI-powered telemedicine web application that digitizes, streamlines, and intelligently triages patient-doctor consultations. Built as a comprehensive health-tech solution, the system combines advanced LLM capabilities (Ollama) with real-time communications to enable users to upload medical reports, book both offline and online appointments, and receive intelligent medical triage before meeting a doctor. 

### 1.2 The Problem
- **Overburdened Healthcare Systems:** Doctors spend significant time manually triaging patients and assessing initial symptoms.
- **Fragmented Medical Records:** Patient reports and medical histories are scattered and not easily accessible in a unified digital format.
- **Access to Immediate Guidance:** Patients lack immediate, calm, and medically-aware guidance when experiencing sudden symptoms, leading to either panic or neglect.
- **Scheduling Inefficiencies:** Managing offline and online clinic appointments often results in double bookings or poor time management.

### 1.3 The Opportunity
Recent advances in localized LLMs (like Llama 3.2 via Ollama) and real-time web technologies (Socket.io, WebRTC) make it possible to build an automated, secure pipeline that accepts patient symptoms, deterministically classifies them by severity, provides instant triage guidance, and seamlessly bridges the gap to a certified medical professional through a unified booking and reporting platform.

### 1.4 Success Metrics
| Metric | Target | Achieved |
| :--- | :--- | :--- |
| **AI Triage Accuracy** | > 90% | Deterministic NLP + LLM explanation (Reliable) |
| **Real-time Notifications** | < 1s latency | Socket.io events functioning smoothly |
| **Report Processing** | Supports PDF/Images | Cloudinary Integration |
| **Deployment** | Cloud-hosted | Vercel (Frontend) + Render (Backend) |

---

## 02 Project Overview & Objectives

### 2.1 What Was Built
A full-stack telemedicine application with a React.js frontend and a Node.js/Express backend service, deployed on cloud infrastructure (Vercel + Render).
- **Frontend (React.js on Vercel):** Interactive UI for Patients and Doctors, real-time chat, appointment dashboards, and medical report viewing.
- **Backend (Node.js + MongoDB on Render):** Handles JWT authentication, OTP-based email verification (Resend), image/PDF processing (Cloudinary), AI-powered triage chatbot (Ollama), real-time notifications (Socket.io), and CRUD operations for appointments and user profiles.

### 2.2 Objectives
- **O1:** Implement secure authentication, OTP verification, and role-based access (Patient/Doctor/Admin).
- **O2:** Provide a conversational AI triage chatbot using localized LLMs.
- **O3:** Facilitate online (video/chat) and offline (clinic) appointment scheduling without conflicts.
- **O4:** Enable secure upload, storage, and retrieval of medical reports (PDFs, Images).
- **O5:** Implement real-time notifications for appointment approvals and chat messages.
- **O6:** Deploy a cloud-hosted multi-service application with external storage.

---

## 03 Proposed Solution & Key Features

### 3.1 Solution Approach
The system replaces manual clinical intake with an automated AI pipeline: (1) NLP-based symptom extraction and severity scoring, (2) Deterministic clinical decision making paired with LLM-generated compassionate explanations, (3) Seamless handover to an integrated appointment scheduling system, and (4) Centralized Cloudinary-backed medical report storage.

### 3.2 Solution Pipeline
`User Input → AI Triage (Ollama + NLP) → Severity Classification → Appointment Booking → Doctor Approval → Consultation (Online/Offline) → Report Upload (Cloudinary) → Secure Storage (MongoDB)`

### 3.3 Key Features
| Feature | Technical Implementation | User Benefit |
| :--- | :--- | :--- |
| **AI Triage Chatbot** | Ollama (llama3.2:3b) + Deterministic Scoring | Instant, reliable assessment of symptoms |
| **Dual Consultation Modes** | Socket.io + Geo-location tracking | Flexibility for offline visits or online calls |
| **Cloud Medical Reports** | Cloudinary API + Multer | Digitize and securely access medical history |
| **Real-Time Notifications** | Socket.io | Instant updates on appointment statuses |
| **Secure Authentication** | JWT + Resend API (OTP) | Secure accounts and password recovery |

---

## 04 System Architecture

### 4.1 Architecture Overview
The system follows a three-tier architecture. Data flows from the browser (Client Layer) through the REST API / WebSocket backend (API Layer), backed by a NoSQL database (Data Layer) and external services for email, storage, and AI processing.

### 4.2 Layer Descriptions
- **Client Layer:** React.js SPA, Patient/Doctor Dashboards (UI, routing, state management).
- **API Layer:** Node.js, Express, Socket.io (Authentication, business logic, AI orchestration, real-time events).
- **Processing Layer:** Ollama AI Engine (Symptom extraction, summarization).
- **Data Layer:** MongoDB Atlas (User data, appointments, metadata), Cloudinary (Binary file storage).

---

## 05 Frontend Architecture & Flowchart

### 5.1 Frontend Technology Stack
- **Framework:** React.js (^18.0.0)
- **Routing:** React Router DOM
- **API Communication:** Axios
- **Styling:** CSS / Tailwind (Optional)
- **Real-Time:** Socket.io-client

### 5.2 Component Tree
```text
├── App.js → Root app & routing
├── components/
│   ├── shared/ → Navbar, Footer, Notifications
│   ├── patient/ → Dashboards, Appointment Booking, AI Chat
│   ├── doctor/ → Schedule Manager, Patient Records
│   └── admin/ → Analytics Panel
└── utils/ → API config, Auth Context
```

---

## 06 Backend Architecture & Flowchart

### 6.1 Backend Technology Stack
| Technology | Purpose |
| :--- | :--- |
| **Node.js + Express** | Primary asynchronous web framework for REST APIs |
| **Socket.io** | WebSocket engine for real-time notifications and chat |
| **Mongoose** | MongoDB ODM for schema validation and relationships |
| **Cloudinary** | Image and PDF pre-processing and cloud storage |
| **Resend** | Transactional email delivery (OTPs, Alerts) |
| **Ollama** | Local LLM inference server for triage and chat |

---

## 07 Database Architecture & ER Diagram

### 7.1 Data Architecture Note
MEDviz uses MongoDB Atlas as a centralized NoSQL document store, optimizing for read-heavy dashboard queries and flexible schema designs for medical records.

### 7.2 MongoDB Collections
- **users:** `_id, email, password, role, profile_details, otp_data`
- **appointments:** `_id, patientId, doctorId, date, time, status, type (online/offline)`
- **reports:** `_id, patientId, file_url, file_type, uploaded_at`
- **notifications:** `_id, userId, message, isRead, timestamp`

---

## 08 Technology Stack

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend** | React.js | Component-based UI framework |
| **Backend** | Node.js / Express | Fast, asynchronous API server |
| **Real-time** | Socket.io | Bidirectional event-driven communication |
| **Database** | MongoDB Atlas | Flexible NoSQL cloud database |
| **Storage** | Cloudinary | Dedicated media optimization and storage |
| **Email** | Resend | Reliable SMTP/API transactional email |
| **AI/ML** | Ollama | Privacy-first local LLM execution |
| **DevOps** | Vercel | Frontend Edge deployment |
| **DevOps** | Render | Backend containerized deployment |

---

## 09 API Documentation

### 9.1 Base URLs
- **Production Frontend:** `https://frontend-eight-drab-76.vercel.app`
- **Production Backend:** `https://medviz-backend.onrender.com`

### 9.2 Core API Endpoints
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/patients/register` | No | Register new patient |
| **POST** | `/api/auth/doctors/register` | No | Register new doctor |
| **POST** | `/api/auth/patients/login` | No | Patient login & JWT creation |
| **POST** | `/api/auth/doctors/login` | No | Doctor login & JWT creation |
| **POST** | `/api/auth/forgot-password` | No | Send OTP for password reset |
| **POST** | `/api/auth/verify-otp` | No | Verify email OTP |
| **GET**  | `/api/appointments` | Yes | Get user appointments |
| **POST** | `/api/appointments` | Yes | Book new appointment |
| **PUT**  | `/api/appointments/:id/status`| Yes | Approve/Reject appointment |
| **POST** | `/api/patient/reports/upload` | Yes | Upload report to Cloudinary |
| **POST** | `/api/chat` | Yes | Query AI Triage chatbot |

---

## 10 Code Implementation Guide

### 10.1 Repository Structure
```text
medviz/
├── frontend/
│   ├── src/components/
│   ├── src/pages/
│   └── package.json
└── backend/
    ├── routes/      # API endpoints (auth.js, appointments.js, etc.)
    ├── models/      # Mongoose Schemas
    ├── services/    # AI logic (ai.js), Email (email.js)
    ├── middleware/  # JWT Auth, Rate Limiting
    ├── server.js    # Entry point & Socket.io init
    └── app.js       # Express app configuration
```

---

## 11 Additional Features
- **Offline Consultation Maps:** Contextual UI integration directing patients to physical clinic locations.
- **Double Booking Prevention:** Algorithmic checks preventing scheduling overlaps.
- **Strict Rate Limiting:** API abuse prevention on Auth and AI endpoints.
- **Heuristic AI Fallbacks:** Ensures triage reliability even if the LLM encounters downtime.

---

## 12 Future Scope & Roadmap

### 12.1 Planned Enhancements
- **Phase 2:** Video Call Integration via WebRTC for seamless in-app online consultations.
- **Phase 3:** Automated OCR on uploaded medical reports to feed historical data into the AI triage engine.
- **Phase 4:** Mobile App (React Native) release.

---

## 13 System Design Considerations

- **Scalability:** Stateless REST APIs via JWT; Socket.io can be scaled using Redis Adapters.
- **Security:** bcrypt password hashing, short-lived OTPs, strict CORS origin whitelisting, HTTP-only configurations.
- **Performance:** Cloudinary CDN for fast report delivery; MongoDB indexes on frequent queries (`patientId`, `doctorId`).
- **Reliability:** AI pipeline uses deterministic heuristic fallbacks so the app never fails if the LLM is overloaded.

---

## 14 Setup & Deployment Instructions

### 14.1 Local Development Setup
**Backend:**
```bash
cd backend
npm install
# Set MONGODB_URI, JWT_SECRET, CLOUDINARY keys, RESEND_API_KEY in .env
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
# Set REACT_APP_API_BASE=http://localhost:5000 in .env
npm start
```

### 14.2 Cloud Deployment
- **Frontend (Vercel):** Connect GitHub repo, set build command to `npm run build`, and add `REACT_APP_API_BASE`.
- **Backend (Render):** Create a Web Service, set runtime to Node, build command to `npm install`, start command to `npm start`, and populate environment variables.

### 14.3 Troubleshooting
- **CORS Errors:** Ensure Vercel URL is correctly placed in Backend `CORS_ORIGIN`.
- **Image Upload Fails:** Verify Cloudinary API Secret is unmasked.
- **AI Fails to Respond:** Ensure Ollama is running locally on port 11434 (`ollama run llama3.2:3b`).
