# Map My Culture
**A Comprehensive AI-Powered Cultural Heritage Preservation Platform**

**DOCUMENT TYPE**: Project Report
**ORGANISATION**: RCTS, IIIT Hyderabad
**Team No**: 6

---

## TABLE OF CONTENTS
01. Executive Summary & Problem Statement
02. Project Overview & Objectives
03. Proposed Solution & Key Features
04. System Architecture
05. Frontend Architecture & Flowchart
06. Backend Architecture & Flowchart
07. Database Architecture & ER Diagram
08. Technology Stack
09. API Documentation
10. Code Implementation Guide
11. Additional Features
12. Future Scope & Roadmap
13. System Design Considerations
15. Setup & Deployment Instructions

---

## 01 Executive Summary & Problem Statement

### 1.1 Executive Summary
The Map My Culture platform is an AI-powered web application that digitises, preserves, and makes searchable India's rich cultural heritage. Built by Team 6 as part of the Design for Social Innovation programme at RCTS, IIIT Hyderabad, the system combines advanced NLP, Speech Recognition, OCR, and Machine Translation technologies to enable users to upload, process, translate, classify, and explore cultural content from across India. The platform supports text, audio, video, image, and PDF inputs, automatically extracting, categorising, and mapping cultural information to specific regions through an interactive and searchable digital experience.

### 1.2 The Problem
- **Cultural Erosion:** Many Indian languages, traditions, folk arts, and oral histories are disappearing due to modernization and declining knowledge transfer.
- **Fragmented Documentation:** Cultural information is scattered across multiple sources, making it difficult to access through a single platform.
- **Language Barrier:** Most cultural content exists in regional languages, limiting accessibility for non-native speakers.
- **No Digital Infrastructure:** There is a lack of tools to digitise and organise cultural artefacts into a searchable digital format.
- **Accessibility Gap:** Global researchers and audiences face challenges in discovering, understanding, and using regional cultural content.

### 1.3 The Opportunity
Recent advances in speech recognition (Google Speech API, Whisper), optical character recognition (Tesseract, Google Gemini Vision), neural machine translation (Google Translate, deep-translator), and extractive text summarisation (NLTK, spaCy) make it possible — for the first time — to build an automated, multilingual pipeline that accepts cultural content in any format, extracts textual information using AI, classifies content into cultural categories, translates across 100+ languages, maps content to geographic regions of India, and stores everything in a searchable structured database accessible via an interactive map UI.

### 1.4 Success Metrics
| Metric | Target | Achieved |
| :--- | :--- | :--- |
| **Audio-to-text extraction accuracy** | ≥ 80% | Google Speech API (95%+ for clear audio) |
| **Image OCR extraction** | Supports 3+ models | Tesseract, Gemini Vision, Table OCR |
| **Video transcription pipeline** | End-to-end automated | Audio extraction → Speech-to-text → Classification |
| **Translation coverage** | 50+ languages | 100+ languages supported |
| **Cultural Categorisation** | 10+ categories | 15 cultural categories with NLP |
| **Deployment** | Cloud-hosted | Vercel + Render deployment |

---

## 02 Project Overview & Objectives

### 2.1 What Was Built
A full-stack web application with a React.js frontend and two Flask backend services, connected via REST APIs and deployed on cloud infrastructure (Vercel + Render). The platform consists of:
- **Frontend (React.js on Vercel):** Interactive map-based UI, user dashboard, admin panel, multi-modal upload interfaces, translation workspace, profile management, and cultural data visualisation.
- **Backend 1 (Flask + PostgreSQL on Render):** Handles regional map data, NLP-based district prediction from cultural text, event/festival management, user registration, and geographic dataset queries.
- **Backend 2 (Flask + MongoDB on Render):** Handles authentication, audio/video/image processing, OCR, speech-to-text, machine translation, document summarisation, multimedia storage (GridFS), admin dashboard data, and cultural content classification.

### 2.2 Objectives
| # | Objective | Status |
| :--- | :--- | :--- |
| O1 | Extract text from audio, image, and video content using AI | Complete |
| O2 | Translate extracted content across 100+ languages | Complete |
| O3 | Classify cultural content into 15+ categories using NLP | Complete |
| O4 | Map cultural data to Indian regions and languages | Complete |
| O5 | Provide an interactive map-based cultural exploration platform | Complete |
| O6 | Implement authentication, user management, and admin dashboard | Complete |
| O7 | Deploy a cloud-hosted multi-service application with multimedia storage | Complete |

---

## 03 Proposed Solution & Key Features

### 3.1 Solution Approach
The system replaces the manual process of cultural documentation with an automated five-stage AI pipeline: (1) multi-modal content upload (text/audio/video/image/PDF), (2) AI-powered text extraction using speech recognition, OCR, and video analysis, (3) NLP-based cultural classification using domain-specific keyword matching, (4) neural machine translation across 100+ languages with dual-engine fallback, (5) geographic region mapping and structured storage in MongoDB.

### 3.2 Solution Pipeline
`Upload Content Text / Audio / Video Image / PDF` → `AI Extraction Speech-to Text OCR / Video Analysis` → `NLP Classification 15 Cultural Categories Keyword Matching Indicators` → `Translation 100+ Languages Deep-translator` → `Region Mapping Language → State District Prediction` → `Storage & Display MongoDB + PostgreSQL Interactive Map UI`

### 3.3 Key Features
| Feature | Technical Implementation | User Benefit |
| :--- | :--- | :--- |
| **Multi-Modal Content Processing** | Supports audio, video, image, text, and PDF uploads | Digitise cultural content in any format |
| **Dual-Audience Reports** | Google Speech API, Tesseract OCR, Gemini Vision | Extract searchable text from media files |
| **AI-Powered Transcription & OCR** | Audio extraction → Speech-to-Text → Classification | Process interviews, performances, and documentaries |
| **Video Analysis Pipeline** | deep-translator + Google Translate (100+ languages) | Make cultural content accessible across languages |
| **Cultural Classification** | NLP engine with 15 cultural categories | Automatically organise and tag content |
| **Interactive Map Exploration** | React-based India map with regional mapping | Explore cultural diversity geographically |
| **Admin & Cloud Storage** | Admin dashboard, GridFS storage, OTP authentication | Secure management and persistent data storage |

---

## 04 System Architecture

### 4.1 Architecture Overview
The system follows a four-layer architecture with a split-backend design. Data flows from the browser (Client Layer) through two independent REST API backends (API Layer), each backed by its own database, with shared AI/ML processing capabilities (Processing Layer) and persistent cloud storage (Data Layer).

### 4.2 Layer Descriptions
- **Client Layer:** React.js SPA, Interactive Map, Dashboard, Admin Panel. User interface; file upload; data visualisation; routing.
- **API Layer — Backend 1:** Flask, SQLAlchemy, NLP Processor. Regional data queries; NLP district prediction; event management; user CRUD (PostgreSQL).
- **API Layer — Backend 2:** Flask, Flask-Login, GridFS, Translation Engine. Authentication; media processing; translation; classification; admin analytics (MongoDB).
- **Processing Layer:** SpeechRecognition, Tesseract, Gemini Vision, moviepy, NLTK. AI-powered text extraction, translation, summarisation, and cultural classification.

---

## 05 Frontend Architecture & Flowchart

### 5.1 Frontend Technology Stack
- **Next.js (^18.0.0):** Component-based UI framework
- **react-router-dom (^6.27.0):** Client-side SPA routing
- **Axios (^1.13.2):** API communication
- **Chart.js / React-ChartJS-2 (^4.4.7 / ^5.3.0):** Analytics and data visualization
- **Framer Motion (^12.5.0):** Animations and page transitions
- **Lucide React (^0.468.0):** Icon library

---

## 06 Backend Architecture & Flowchart

### 6.1 Backend 1 Technology Stack (PostgreSQL)
- **Python (3.11):** Primary language
- **FastAPI (latest):** Async ASGI web framework
- **Flask-SQLAlchemy (latest):** YOLOv11 implementation API
- **PostgreSQL (14+):** Deep learning framework underlying YOLO

### 6.2 Backend 2 Technology Stack (MongoDB)
- **Flask:** Web framework for REST APIs
- **Flask-Login:** Session-based authentication
- **PyMongo + GridFS:** MongoDB integration and file storage
- **SpeechRecognition:** Audio-to-text conversion
- **moviepy + pydub:** Video and audio processing
- **pytesseract + Gemini Vision:** OCR and image text extraction
- **deep-translator + googletrans:** Multi-language translation
- **pdfplumber + NLTK + spaCy:** PDF extraction and text summarisation

---

## 07 Database Architecture & ER Diagram

### 7.1 Data Architecture Note
Map My Culture uses a dual-database architecture: PostgreSQL (Backend 1) — relational storage for structured user data, text submissions, audio/video metadata with district predictions, and regional datasets; MongoDB Atlas (Backend 2) — document storage for authentication, multimedia metadata, translations, cultural classifications, GridFS file storage, and admin analytics.

### 7.3 MongoDB Collections (Backend 2)
- **users_collection:** User accounts and profile management
- **multimedia_collection:** Stores uploaded media metadata and AI results
- **translations_collection:** Translation history and language mapping
- **trash_collection:** Soft-deleted items and recovery management
- **interested_customer:** Contact form submissions and inquiries
- **GridFS Files:** Binary storage for audio, video, images, and documents

---

## 08 Technology Stack

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend** | React.js | Component-based UI framework |
| **Backend 1** | Flask + SQLAlchemy | Web framework with PostgreSQL integration |
| **Backend 2** | Flask + Flask-Login | REST APIs and authentication |
| **AI/ML** | SpeechRecognition | Audio-to-text conversion |
| **DevOps** | Vercel | Frontend deployment |
| **DevOps** | Render | Backend deployment |
| **DevOps** | MongoDB Atlas | Cloud database hosting |

---

## 09 API Documentation

### 9.1 Base URLs
- **Production Frontend:** `https://map-my-culture.vercel.app`
- **Backend 1:** `https://map-my-culture.onrender.com`
- **Backend 2:** `https://backend2-y8gs.onrender.com`

---

## 10 Code Implementation Guide

### 10.1 Repository Structure
```text
amap-my-culture/
├── frontend2/           # React.js application
├── backend/             # Flask Backend 1 (PostgreSQL)
└── backend2/            # Flask Backend 2 (MongoDB)
```

---

## 11 Additional Features
- **Trash & Recovery System:** Soft-delete, recovery, and permanent deletion of files.
- **OTP Password Reset:** Secure password recovery using 6-digit OTP verification.
- **Admin Dashboard:** User management, analytics, and upload statistics.
- **Multi-Model OCR:** Text extraction using multiple OCR engines.

---

## 12 Future Scope & Roadmap

### 12.1 Planned Enhancements
- **Phase 2 (6 mo):** Mobile App & Multi-language UI, Advanced NLP Classification.
- **Phase 3 (12 mo):** Government APIs & Research Export, Crowdsourced Verification.
- **Phase 4 (18 mo):** AI Cultural Storytelling, Federated Learning & Global Expansion.

---

## 13 System Design Considerations
- **Scalability:** Stateless API design; Cloud-native databases (MongoDB Atlas + Render PostgreSQL); Split backend architecture.
- **Reliability:** Graceful error handling; Translation fallback.
- **Performance:** Dual-engine translation; GridFS streaming.

---

## 15 Setup & Deployment Instructions

### 15.2 Local Development Setup

**Backend 1 (Flask + PostgreSQL):**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

**Backend 2 (Flask + MongoDB):**
```bash
cd backend2
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Frontend (React):**
```bash
cd frontend2
npm install
npm start
```
