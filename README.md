
# Behavioral Threat Detection and Automated Response for Decentralized Systems

## Overview

This project presents a machine learning-based behavioral threat detection framework for decentralized systems, with a focus on Ethereum account behavior.

The system learns normal behavioral profiles from aggregated Ethereum account features and identifies accounts whose behavior deviates significantly from the learned normal patterns.

It combines multiple anomaly detection techniques into a weighted ensemble and assigns a threat severity level. Based on the severity, the system generates an automated security response.

> **Note:** The current blockchain mitigation mechanism is simulated. It does not execute real on-chain account freezing or circuit-breaker transactions.

---

## Key Features

- Behavioral anomaly detection for Ethereum accounts
- Multiple machine learning and unsupervised learning models
- Weighted ensemble threat scoring
- Threat classification and severity assessment
- Automated response generation
- Explainable AI (XAI) support
- Ethereum account analysis
- Batch CSV dataset analysis
- Blockchain network visualization
- Threat history tracking
- Model performance comparison
- Security monitoring dashboard
- MongoDB-based authentication
- OTP-based authentication and password recovery
- FastAPI backend
- React + Vite frontend
- Simulated smart-contract mitigation

---

## System Architecture

```text
Ethereum Account Data
        |
        v
Feature Preprocessing
        |
        v
Behavioral Feature Extraction
        |
        +-------------------------------+
        |                               |
        v                               v
   Anomaly Models                 Graph Model
        |                               |
        +---------------+---------------+
                        |
                        v
              Score Normalization
                        |
                        v
               Weighted Ensemble
                        |
                        v
                 Threat Score
                        |
                        v
              Threat Classification
                        |
                        v
                Severity Engine
                        |
            +-----------+-----------+
            |           |           |
            v           v           v
          Normal       Medium       High
            |           |           |
            v           v           v
          Allow      Monitor       Flag
                                  Account
                                     |
                                     v
                         Simulated Circuit Breaker
````

---

## Machine Learning Models

The system uses eight behavioral/anomaly detection approaches:

1. Isolation Forest
2. Deep Autoencoder
3. One-Class SVM
4. GAN-based anomaly detection
5. K-Means
6. DBSCAN
7. HDBSCAN
8. Behavioral Graph Model

The individual model scores are normalized and combined using a weighted ensemble.

### Ensemble Weights

| Model                  | Weight |
| ---------------------- | -----: |
| Isolation Forest       |   0.25 |
| Deep Autoencoder       |   0.25 |
| One-Class SVM          |   0.15 |
| GAN                    |   0.15 |
| HDBSCAN                |   0.08 |
| DBSCAN                 |   0.05 |
| Behavioral Graph Model |   0.05 |
| K-Means                |   0.02 |

---

## Behavioral Features

The system uses 16 canonical behavioral features derived from Ethereum account activity, including transaction, address, smart-contract, and ERC20-related behavior.

The features are preprocessed using `RobustScaler` before being passed to the anomaly detection models.

---

## Threat Detection Pipeline

```text
Input Ethereum Account
        ↓
Feature Extraction
        ↓
Preprocessing
        ↓
8 Anomaly Detection Models
        ↓
Score Normalization
        ↓
Weighted Ensemble
        ↓
Final Anomaly Score
        ↓
Threat Classification
        ↓
Severity Assessment
        ↓
Automated Response
```

---

## Threat Severity

The system categorizes detected behavior into four levels:

| Severity | Meaning                                               |
| -------- | ----------------------------------------------------- |
| NORMAL   | Behavior is within the learned normal profile         |
| LOW      | Minor behavioral deviation                            |
| MEDIUM   | Significant behavioral deviation requiring monitoring |
| HIGH     | Strong anomaly requiring immediate security action    |

---

## Automated Response

The response engine maps threat severity to a defensive action.

| Severity | Response            |
| -------- | ------------------- |
| NORMAL   | `ALLOW_TRANSACTION` |
| LOW      | `LOG_ACTIVITY`      |
| MEDIUM   | `MONITOR_ACCOUNT`   |
| HIGH     | `FLAG_ACCOUNT`      |

For high-severity threats, the prototype generates a simulated circuit-breaker action:

```text
security_council.circuitBreaker(
    PAUSE_AND_FREEZE
)
```

> **Important:** The current implementation simulates the blockchain mitigation response. It does not actually freeze an Ethereum account or execute a real smart-contract transaction.

---

## Explainable AI

The system provides explainability information to help understand why an account received an anomalous score.

The XAI component is integrated into the prediction workflow so that detected threats can be examined beyond the final classification.

---

## Model Performance

The implemented models were evaluated using accuracy, precision, recall, F1-score, and ROC-AUC.

| Model                  | Accuracy | Precision | Recall |     F1 | ROC-AUC |
| ---------------------- | -------: | --------: | -----: | -----: | ------: |
| GAN                    |   99.89% |    98.90% |   100% | 99.45% |  1.0000 |
| Deep Autoencoder       |     100% |      100% |   100% |   100% |  1.0000 |
| One-Class SVM          |     100% |      100% |   100% |   100% |  1.0000 |
| K-Means                |   99.33% |    93.75% |   100% | 96.77% |  0.9993 |
| DBSCAN                 |   98.78% |    90.72% | 97.78% | 94.12% |  0.9953 |
| HDBSCAN                |   98.56% |    90.53% | 95.56% | 92.97% |  0.9943 |
| Isolation Forest       |   96.22% |    74.14% | 95.56% | 83.50% |  0.9785 |
| Behavioral Graph Model |   84.89% |    36.63% |    70% | 48.09% |  0.8722 |
| Weighted Ensemble      |   99.89% |    98.90% |   100% | 99.45% |  1.0000 |

### Held-Out Test Set

The final ensemble was also evaluated on a held-out test set of 900 samples:

* **Accuracy:** 99.78%
* **Precision:** 97.83%
* **Recall:** 100%
* **F1-score:** 98.90%
* **ROC-AUC:** 0.9997

---

## Technology Stack

### Backend

* Python
* FastAPI
* Scikit-learn
* TensorFlow / Keras
* Pandas
* NumPy
* MongoDB
* SQLite
* Uvicorn

### Frontend

* React
* Vite
* JavaScript
* CSS

### Blockchain

* Ethereum
* Solidity
* Simulated Circuit Breaker contract

### Machine Learning

* Isolation Forest
* Autoencoder
* One-Class SVM
* GAN
* K-Means
* DBSCAN
* HDBSCAN
* Graph-based behavioral modeling

---

## Project Structure

```text
Behavioral_Threat_Detection/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── mongo_db.py
│   ├── requirements.txt
│   │
│   ├── schemas/
│   │
│   ├── services/
│   │   ├── anomaly_service.py
│   │   ├── auth_service.py
│   │   ├── batch_service.py
│   │   ├── ensemble_service.py
│   │   ├── explainability_service.py
│   │   ├── model_loader.py
│   │   ├── prediction_service.py
│   │   ├── preprocessing.py
│   │   └── response_service.py
│   │
│   └── tests/
│
├── contracts/
│   └── CircuitBreaker.sol
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── models/
│   ├── autoencoder.pkl
│   ├── dbscan.pkl
│   ├── ensemble_config.json
│   ├── gan_discriminator.pkl
│   ├── gan_generator.pkl
│   ├── graph_model.pkl
│   ├── hdbscan.pkl
│   ├── isolation_forest.pkl
│   ├── kmeans.pkl
│   ├── one_class_svm.pkl
│   ├── scaler.pkl
│   └── score_scalers.pkl
│
├── train_and_export.py
├── .gitignore
└── README.md
```

---

## Dataset

The project uses the **Ethereum Fraud Detection Dataset** from Kaggle.

Dataset source:

[https://www.kaggle.com/datasets/vagifa/ethereum-frauddetection-dataset](https://www.kaggle.com/datasets/vagifa/ethereum-frauddetection-dataset)

The dataset contains aggregated behavioral information associated with Ethereum accounts and is used to train and evaluate the behavioral anomaly detection pipeline.

> The implementation focuses on account-level behavioral/anomaly detection rather than direct real-time transaction-stream monitoring.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Harshini-1002/Behavioral_Threat_Detection.git
cd Behavioral_Threat_Detection
```

### 2. Create a Python Virtual Environment

```bash
python -m venv venv
```

For Windows:

```bash
venv\Scripts\activate
```

### 3. Install Backend Dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Running the Backend

From the project root:

```bash
uvicorn backend.main:app --reload
```

The FastAPI backend will start locally.

---

## Running the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Then open the local URL displayed by Vite.

---

## Authentication

The project includes:

* User registration
* Email OTP verification
* Direct login
* Forgot password recovery
* JWT-based sessions
* Role-based user information

The repository also contains demo credentials for project evaluation.

> **Demo accounts should only be used for demonstration/testing purposes.**

---

## Main Application Pages

The application includes:

* Dashboard
* Account Analysis
* Threat Details
* Threat History
* Model Performance
* Dataset Analysis
* Blockchain Network
* Live Ethereum Account Analysis

---

## Dashboard

The dashboard provides:

* Total account statistics
* Threat count
* Normal accounts
* High-risk accounts
* Average anomaly score
* Network distribution
* Severity distribution
* Recent anomaly scores
* Model performance
* Threat detection pipeline

---

## Testing

Backend tests are available under:

```text
backend/tests/
```

Run the tests using:

```bash
pytest backend/tests/
```

---

## Security

The project includes:

* Environment-variable based configuration
* PBKDF2-HMAC-SHA256 password hashing
* Random password salts
* OTP expiration and single-use validation
* Input validation
* CSV validation
* Authentication protection
* Injection protections

> Do not place real API keys, database credentials, email credentials, JWT secrets, or other sensitive information directly in source code.

---

## Limitations

The current prototype has several limitations:

1. The dataset contains aggregated account-level behavioral features rather than a complete live transaction stream.
2. The system focuses primarily on behavioral/anomaly detection.
3. Blockchain mitigation is currently simulated.
4. The graph component is based on available behavioral/graph-derived information rather than a complete live Ethereum transaction graph.
5. Real-time on-chain enforcement would require deployment and integration with an actual blockchain environment.

---

## Future Enhancements

* Real-time Ethereum transaction monitoring
* Live blockchain event streaming
* Deployment of the circuit-breaker contract to a test network
* Web3 integration for real transaction execution
* Larger and more diverse blockchain datasets
* Advanced graph neural networks
* Continuous model updating
* Real-time alert notifications
* Production-grade cloud deployment

---

## Project Objective

The objective of this project is to develop a behavioral security framework that can learn normal Ethereum account behavior, detect significant deviations, combine multiple anomaly detection models, explain detected threats, and generate automated security responses.

---

## Disclaimer

This project is an academic/research prototype intended for demonstration and experimentation.

The automated blockchain response mechanism is simulated and should not be considered a production security system.

---

## Author

**Harshini**

**Behavioral Threat Detection and Automated Response for Decentralized Systems**

