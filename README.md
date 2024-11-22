# AI Assistant Minimal

This project consists of a Flask backend and a React frontend. Follow the steps below to set up and run the application.

---

## Prerequisites

- Python 3.7 or higher
- Node.js and npm

---

## Backend Setup

1. Create Virtual Environment
   ```
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Get openai api key:
   ```
   touch .env
   Copy: OPENAI_API_KEY=sk-proj-RnNs..........
   ```

6. Run the Flask server:
   ```bash
   python app.py
   ```

---

## Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   sudo apt install npm
   npm install
   ```
3. Change the ip address:
   ```bash
   cd frontend/src/lib
   nano api.js
   # (API_URL) change from local host to the ip of ec2 on 2nd line 
   ```

5. Run the React app:
   ```bash
   npm run dev
   ```

---

## Running the Application

1. Start the Flask server:
   ```bash
   python app.py
    ```      

2. Start the React app:
   ```bash
   npm run dev
   ```

---

## Notes
- The Flask server runs on port 5000.
- The React app runs on port 5173.

