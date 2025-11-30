# API Documentation

This document provides a detailed overview of the Surprise Sender API.

## Authentication

All API endpoints require a valid JWT token to be included in the `Authorization` header.

## Endpoints

### /api/auth

- `POST /login`: Authenticate a user and receive a JWT token.
- `POST /register`: Register a new user.

### /api/email

- `POST /send`: Send a single email.
- `POST /send-bulk`: Send a bulk email job.
- `POST /send-template`: Send an email using a template.
- `POST /validate-smtp`: Validate SMTP configurations.
- `GET /templates`: Get a list of email templates.

### /api/agents

- `GET /`: Get a list of all agents.
- `GET /:id`: Get a specific agent.
- `POST /`: Create a new agent.
- `PUT /:id`: Update an agent.
- `DELETE /:id`: Delete an agent.
- `POST /crews`: Create a new crew.
- `GET /crews`: Get a list of all crews.
- `GET /crews/:id`: Get the status of a crew.
- `POST /crews/:id/tasks`: Assign a task to a crew.
- `GET /tasks/:taskId`: Get the status of a task.
- `POST /send-generated`: Generate and send an email using an agent.
- `POST /generate-email`: Generate email content using an agent.
- `POST /analyze-content`: Analyze content using an agent.
