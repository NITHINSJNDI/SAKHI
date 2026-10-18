# 3-Tier AI Health Application

This is a complete, 3-tier wellness companion featuring a Next.js App Router frontend, Express middleware, and a FastAPI machine learning microservice.

## Problem Statement

Women's reproductive health data—spanning menstrual cycle logs, PCOS markers, and thyroid conditions—is often complex, deeply interconnected, and traditionally siloed. Currently, women rely on fragmented symptom trackers or static calendars that do not analyze underlying health patterns or provide proactive insights. This makes it difficult to bridge the gap between simply logging symptoms and understanding critical reproductive health risks. There is a pressing need for an intelligent, unified platform that can synthesize this data, accurately predict cycle variations, assess risks for conditions like PCOS, and deliver empathetic, data-driven guidance. Our project addresses this by providing an AI-driven conversational agent that empowers women to take proactive control of their menstrual and reproductive wellness.

## Proposed Solution

We developed **SAKHI**, an innovative AI-powered conversational health companion designed to demystify women's reproductive health. To solve the problem of fragmented and siloed health tracking, SAKHI leverages a robust 3-tier architecture that seamlessly blends empathic natural language processing with rigorous, deterministic machine learning models. 

Our solution introduces "Agentic Routing" utilizing the Gemini API. When a user interacts with the intuitive chat interface, the system intelligently identifies if a query requires data-driven analysis. It securely routes these specific queries to our FastAPI microservice, which executes custom machine learning models—specifically targeting **PCOS risk assessment**, **thyroid disorder screening**, and **intelligent cycle forecasting**. By running these deterministic classifiers on the user's logged biomarkers (e.g., cycle length, weight fluctuations, chronic fatigue, acne severity), SAKHI generates probabilistic risk scores and health insights.

By synthesizing these predictive outputs back into compassionate, conversational responses, SAKHI transforms raw symptom data into personalized, actionable guidance. This unified approach empowers users with real-time awareness of their reproductive health patterns, moving beyond static calendars into proactive, preventative care.

## Machine Learning Models for Menstrual Health

To provide truly personalized and proactive care, SAKHI is powered by specialized, locally hosted machine learning models focused on key areas of menstrual and reproductive health. Our FastAPI microservice runs these deterministic models to generate probabilistic insights, which are then synthesized by our AI agent into empathetic guidance:

1. **PCOS Risk Assessment Model**
   Polycystic Ovary Syndrome (PCOS) is a common hormonal disorder that is often underdiagnosed. Our model takes user-reported biomarkers—such as cycle regularity, sudden weight changes, acne severity, and unusual hair growth—and runs them through a trained classifier. It outputs a probabilistic risk score for PCOS, empowering users to seek timely medical consultation with concrete data in hand.

2. **Thyroid Disorder Screening Model**
   Thyroid imbalances are intricately linked to menstrual health, frequently causing irregular cycles and metabolic challenges. This model evaluates symptoms like chronic fatigue, temperature sensitivity, unexplained weight fluctuations, and cycle length variations to predict the likelihood of a thyroid condition, bridging the gap between general symptom tracking and targeted reproductive health screening.

3. **Intelligent Cycle Forecasting**
   Moving beyond simple averages used by static calendar apps, our cycle prediction engine analyzes historical menstrual data. It calculates the probability of cycle regularity and dynamically forecasts the days until the next period, adapting to the user's unique physiological patterns over time.

---

## 🏗️ Architecture & Data Flow

```
[Next.js Chat UI]  <--->  [Express Backend]  <--->  [Gemini 2.5 API]
                             | (intercepts functionCall)
                             v
                         [FastAPI Service] (loads .pkl models)
```

1. **User Query**: User posts a message in the chat portal (e.g., *"Assess my PCOS risk"*).
2. **Gemini Decoupling**: Express forwards the chat history to Gemini with tool definitions enabled.
3. **Function Routing**: Gemini decides if the query needs ML classification.
   - If yes: Emits tool call `predict_pcos(weight, cycle_regularity, acne_severity)`.
   - If no: Answers directly in natural language.
4. **Local Intercept**: Express catches the tool call, makes a POST request to FastAPI on `http://localhost:8000/predict/pcos`.
5. **Inference**: FastAPI loads the local `pcos.pkl` model, scores the request, and returns JSON.
6. **Synthesis**: Express feeds the prediction back as a tool response to Gemini, which synthesizes a clean, compassionate summary for the user.

---

## 📡 API Contracts & Payloads

### 1. FastAPI (Port 8000)
- **POST `/predict/cycle`**
  - **Request Schema**:
    ```json
    {
      "last_period_date": "2026-06-15",
      "cycle_length_avg": 28
    }
    ```
  - **Response Schema**:
    ```json
    {
      "status": "success",
      "days_since_last_period": 25,
      "is_regular": 1,
      "probability_regular": 0.88,
      "days_until_next_period": 3
    }
    ```

- **POST `/predict/pcos`**
  - **Request Schema**:
    ```json
    {
      "weight": 62.5,
      "cycle_regularity": 0,
      "acne_severity": 7
    }
    ```
  - **Response Schema**:
    ```json
    {
      "status": "success",
      "has_pcos": 1,
      "probability_pcos": 0.74
    }
    ```

### 2. Express Backend (Port 3001)
- **POST `/api/chat`**
  - **Request Schema**:
    ```json
    {
      "sessionId": "user_email@example.com",
      "message": "My last period was on 2026-06-15 and average cycle is 28. Predict my next period."
    }
    ```
  - **Response Schema**:
    ```json
    {
      "reply": "Your next period is due in approximately 3 days...",
      "history": [...]
    }
    ```

---

## 🚀 Setup & Launch Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup Environment
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
ML_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_actual_gemini_api_key
```

### Starting the Application

#### On Windows (PowerShell):
```powershell
./start.ps1
```

#### On Linux / macOS (Bash):
```bash
chmod +x start.sh
./start.sh
```

---

## 🔍 How to Test
1. Access the web interface at `http://localhost:3002`.
2. Fill out the Sign-Up form. Once submitted, you will be redirected straight to the `/dashboard` chat portal.
3. Test a standard query: *"Hello, what is SAKHI?"* (Gemini will answer directly).
4. Test a cycle prediction: *"My last period was 10 days ago. Average cycle is 28. When is my next cycle?"* (Express will fetch the FastAPI result and output a synthesized text response).

---

## Inspiration
Women's reproductive health data—spanning menstrual cycle logs, PCOS markers, and thyroid conditions—is often complex, deeply interconnected, and traditionally siloed. We were inspired to build **SAKHI** (a holistic health-tech companion) to bridge the gap between tracking symptoms and understanding underlying patterns. 

To ensure the experience feels deeply personalized, we introduced two distinct conversational profiles: **Her Mode** and **Mom Mode**. We recognized that a woman's health journey changes dramatically over time. The needs of someone tracking their cycle or managing PCOS are fundamentally different from someone navigating pregnancy. **Her Mode** is designed for general reproductive health, providing AI-driven insights on menstrual cycles, thyroid data, and PCOS risks. In contrast, **Mom Mode** adapts the platform to focus on prenatal care, fetal development, and maternal well-being. By separating these contexts, we ensure the AI's persona, knowledge base, and predictive models provide relevant, empathetic, and specialized support for every stage of a woman's life. Ultimately, we wanted to empower users with an intuitive conversational interface backed by rigorous AI analysis to provide real-time, actionable insights.

## What it does
SAKHI is an AI-powered conversational agent that helps women track and manage their reproductive health. Through an intuitive chat interface, users can converse with Sakhi to receive personalized insights based on their health data. Sakhi intelligently identifies when a user is asking for general advice versus when they need data-driven predictions. By routing queries through a robust machine learning backend, SAKHI can predict cycle lengths, estimate PCOS risks, and offer guidance on thyroid management. The dual "Her Mode" and "Mom Mode" ensures the advice is always tailored to the user's specific life stage, offering empathetic and accurate responses ranging from standard menstrual health to week-by-week fetal development.

## How we built it
We engineered a robust 3-tier architecture:
- **Frontend**: A highly interactive Next.js App Router providing a seamless chat interface and dynamic user onboarding.
- **Backend & Orchestration**: An Express middleware server that maintains conversation history and integrates with the **Gemini 2.5 API** using function calling to intelligently route queries.
- **Machine Learning Engine**: A FastAPI microservice that hosts our trained predictive models. 

When a user asks about their cycle or PCOS risk, Gemini detects the intent and triggers a tool call. Our Express server then passes the structured data to FastAPI. We utilized predictive modeling logically grounded in probability:

$$
P(Y=1|X) = \frac{1}{1 + e^{-(\beta_0 + \beta_1 X_1 + \dots + \beta_n X_n)}}
$$

where $X_i$ represents key biomarkers such as weight, cycle regularity, and acne severity.

## Challenges we ran into
- **Agentic Routing**: Orchestrating Gemini to reliably emit tool calls instead of hallucinating natural language responses required precise system prompting and strict JSON schema definitions.
- **Data Standardization**: Harmonizing diverse inputs from natural language chat into the strict numerical formats demanded by our `.pkl` models.
- **Latency & Integration**: Connecting three distinct layers (Next.js, Node/Express, Python/FastAPI) and an external LLM API without introducing noticeable lag during a live chat experience.

## Accomplishments that we're proud of
We are incredibly proud to have built a system that genuinely feels empathetic while remaining mathematically rigorous. Successfully implementing **Gemini Function Calling** to bridge natural language processing with our local FastAPI machine learning models was a major technical milestone. Furthermore, developing the dual-persona framework (Her Mode and Mom Mode) within a single unified chat interface allowed us to deliver a highly nuanced and personalized user experience.

## What we learned
- **LLM Function Calling**: We mastered the art of decoupling natural language processing from deterministic ML scoring by using Gemini as an intelligent router rather than a direct answer engine.
- **Microservice Design**: We learned how to isolate complex Python data science dependencies away from our fast Next.js UI via RESTful APIs.
- **Empathic AI Design**: Most importantly, we learned how to synthesize raw probabilistic outputs—like a $0.74$ probability of PCOS—into a compassionate, easy-to-understand message that encourages medical consultation without causing unnecessary panic.

## What's next for Sakhi
Moving forward, we plan to expand SAKHI's capabilities by integrating with wearable health devices (like smartwatches and continuous glucose monitors) to provide even more granular, real-time insights. We also aim to expand **Mom Mode** with a more robust postpartum recovery module, and we hope to fine-tune our own localized LLM to ensure absolute data privacy for all our users' sensitive health information.

## Built with
`next.js`, `react`, `typescript`, `tailwind-css`, `node.js`, `express.js`, `python`, `fastapi`, `scikit-learn`, `pandas`, `gemini-api`, `google-gemini`, `machine-learning`, `artificial-intelligence`, `predictive-modeling`, `data-science`, `healthcare`, `femtech`, `microservices`, `rest-api`, `javascript`, `html`, `css`
