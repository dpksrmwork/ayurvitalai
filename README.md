# AyurVital HealthTech Platform

A premium, modular SaaS platform for appointment scheduling, medical practitioner registries, and patient portal coordination. The platform utilizes a **Vite Module Federation** microfrontend (MFE) architecture on the frontend and a decoupled, robust **FastAPI (Python)** REST API on the backend.

---

## 1. System Architecture Diagram

```mermaid
graph TD
    Browser["Client Browser"]
    
    subgraph Frontend MFE (Nginx Web Servers)
        HostShell["Host Container (Port 3000)
        - Auth Gate
        - Layout & Navigation"]
        
        DocMFE["Doctor Remote (Port 3001)
        - Schedule Configuration
        - Booking Confirmations"]
        
        PatMFE["Patient Remote (Port 3002)
        - Specialist Directory
        - Scheduler Booking"]
        
        AdminMFE["Admin Remote (Port 3003)
        - User Moderation
        - Metrics Dashboard"]
    end
    
    subgraph API & Storage (Python/Docker)
        FastAPI["FastAPI REST Engine (Port 8000)"]
        SQLite[("SQLite DB (healthtech.db)")]
    end
    
    %% Load Chunks
    Browser -->|"1. Requests Welcome/Portal Shell"| HostShell
    Browser -->|"2. Fetches remoteEntry.js dynamically"| DocMFE
    Browser -->|"2. Fetches remoteEntry.js dynamically"| PatMFE
    Browser -->|"2. Fetches remoteEntry.js dynamically"| AdminMFE
    
    %% REST Calls
    Browser -->|"3. Bearer Auth REST Requests"| FastAPI
    FastAPI <-->|"4. Database Transactions"| SQLite
```

---

## 2. Container Port Mappings

The application stack is fully containerized and orchestrated via Docker Compose:

| Container Name | Service Name | Internal Port | Host Port Mapping | Role |
| :--- | :--- | :--- | :--- | :--- |
| **`ayurvitalai-backend-1`** | `backend` | `8000` | `8000:8000` | FastAPI Python API server |
| **`ayurvitalai-container-1`** | `container` | `80` (Nginx) | `3000:80` | Host Shell welcome page & layouts |
| **`ayurvitalai-doctor-mfe-1`** | `doctor-mfe` | `80` (Nginx) | `3001:80` | Doctor dashboard remote chunk |
| **`ayurvitalai-patient-mfe-1`** | `patient-mfe` | `80` (Nginx) | `3002:80` | Patient portal remote chunk |
| **`ayurvitalai-admin-mfe-1`** | `admin-mfe` | `80` (Nginx) | `3003:80` | Admin metrics remote chunk |

---

## 3. Quick Start (Docker Compose)

To spin up the entire production-ready environment in Docker:

```bash
# Clone the repository and run Compose from the workspace root:
docker compose up -d --build

# View container logs
docker compose logs -f
```

Once running, navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. Local Development Mode

To run the frontend and backend locally in sandbox/hot-reload mode:

### A. Start the FastAPI Backend
```bash
cd healthtech-backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### B. Start the Frontend Monorepo
```bash
cd healthtech-frontend
npm install
npm run dev:all
```
This launches:
* **Host Shell:** `http://localhost:3000`
* **Doctor Remote:** `http://localhost:3001`
* **Patient Remote:** `http://localhost:3002`
* **Admin Remote:** `http://localhost:3003`

---

## 5. Demo Accounts

For quick validation, the landing login views are pre-populated with these credentials:

* **Doctor Portal:**
  * **Email:** `doctor1@healthtech.com` or `doctor2@healthtech.com`
  * **Password:** `password123`
* **Patient Portal:**
  * **Email:** `patient1@healthtech.com`
  * **Password:** `password123`
* **Admin Portal:**
  * **Email:** `admin@healthtech.com`
  * **Password:** `adminpassword`
