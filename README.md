# Task Manager API — Take-Home Assignment

A tested and extended Task Manager REST API built with **Node.js, Express, Jest, and Supertest**.

This project was completed as part of the Full Stack Developer Intern take-home assignment for Underpin Services.

## Overview

The original codebase was an intentionally untested Task Manager API using an in-memory data store.

The work completed includes:

- Unit tests for the task service
- Integration tests for all API routes
- Edge-case and validation testing
- Identification and fixing of a pagination bug
- Implementation of task assignment
- Tests for the new assignment feature
- Coverage analysis

---

## Tech Stack

- **Node.js**
- **Express.js**
- **Jest**
- **Supertest**
- **UUID**
- In-memory data store

No external database is required.

> The in-memory data store is reset whenever the server restarts.

---

## Project Structure

```text
task-api/
├── src/
│   ├── app.js
│   ├── routes/
│   │   └── tasks.js
│   ├── services/
│   │   └── taskService.js
│   └── utils/
│       └── validators.js
├── tests/
│   ├── taskService.test.js
│   └── tasks.integration.test.js
├── jest.config.js
├── package.json
└── package-lock.json

ASSIGNMENT.md
BUG_REPORT.md
README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
git clone <your-repository-url>
cd task-api
npm install
```

### Start the API

```bash
npm start
```

The API runs on:

```text
http://localhost:3000
```

---

## Testing

Run the complete test suite:

```bash
npm test
```

Run tests serially:

```bash
npm test -- --runInBand
```

Run the coverage report:

```bash
npm run coverage
```

### Test Results

The completed implementation currently has:

| Metric             |        Result |
| ------------------ | ------------: |
| Test suites        |      2 passed |
| Tests              | **50 passed** |
| Statement coverage |    **96.15%** |
| Branch coverage    |    **90.80%** |
| Function coverage  |    **93.10%** |
| Line coverage      |    **95.77%** |

The test suite covers both service-level behavior and HTTP API behavior.

---

## API Reference

| Method   | Endpoint                 | Description             |
| -------- | ------------------------ | ----------------------- |
| `GET`    | `/tasks`                 | List all tasks          |
| `GET`    | `/tasks?status=todo`     | Filter tasks by status  |
| `GET`    | `/tasks?page=1&limit=10` | Paginated task list     |
| `POST`   | `/tasks`                 | Create a task           |
| `PUT`    | `/tasks/:id`             | Update a task           |
| `DELETE` | `/tasks/:id`             | Delete a task           |
| `PATCH`  | `/tasks/:id/complete`    | Mark a task as complete |
| `GET`    | `/tasks/stats`           | Get task statistics     |
| `PATCH`  | `/tasks/:id/assign`      | Assign a task to a user |

---

## Task Shape

A task has the following structure:

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO string | null",
  "completedAt": "ISO string | null",
  "createdAt": "ISO string"
}
```

An assigned task additionally contains:

```json
{
  "assignee": "string"
}
```

---

## Create a Task

### Request

```http
POST /tasks
Content-Type: application/json
```

Example:

```json
{
  "title": "Write tests",
  "description": "Complete API test coverage",
  "priority": "high"
}
```

### Response

```json
{
  "id": "uuid",
  "title": "Write tests",
  "description": "Complete API test coverage",
  "status": "todo",
  "priority": "high",
  "dueDate": null,
  "completedAt": null,
  "createdAt": "2026-09-29T00:00:00.000Z"
}
```

---

## Assign a Task

### Endpoint

```http
PATCH /tasks/:id/assign
```

### Request

```json
{
  "assignee": "Alice"
}
```

### Successful response

```http
200 OK
```

```json
{
  "id": "uuid",
  "title": "Write tests",
  "assignee": "Alice"
}
```

### Validation

The endpoint rejects:

- Missing `assignee`
- Empty strings
- Whitespace-only strings
- Non-string values

These requests return:

```http
400 Bad Request
```

### Missing task

If the task does not exist:

```http
404 Not Found
```

```json
{
  "error": "Task not found"
}
```

### Already assigned

A task cannot be reassigned through this endpoint once an assignee exists.

The API returns:

```http
409 Conflict
```

```json
{
  "error": "Task is already assigned"
}
```

The assignee is trimmed before being stored, so `"  Alice  "` is stored as `"Alice"`.

---

## Bug Found and Fixed

### Pagination offset bug

The original pagination implementation calculated the offset as:

```js
const offset = page * limit;
```

The API uses 1-based page numbers, so requesting:

```text
?page=1&limit=2
```

incorrectly skipped the first two tasks.

The implementation was changed to:

```js
const offset = (page - 1) * limit;
```

Tests were written to reproduce the issue before the fix and then verified the corrected behavior.

More details are documented in [`BUG_REPORT.md`](./BUG_REPORT.md).

---

## Testing Approach

### Unit tests

`tests/taskService.test.js` tests the task service directly, including:

- Task creation
- Default values
- Task lookup
- Status filtering
- Pagination
- Statistics
- Overdue tasks
- Task updates
- Task deletion
- Task completion
- Task assignment
- Missing-task behavior
- Already-assigned behavior

### Integration tests

`tests/tasks.integration.test.js` uses Supertest against the actual Express application.

The integration suite covers:

- All existing API endpoints
- Successful requests
- Validation failures
- Missing resources
- Pagination
- Filtering
- Statistics
- Task completion
- Task assignment
- Already-assigned tasks

The tests focus on externally observable behavior rather than implementation details.

---

## Design Decisions

### Pagination

Page numbers are treated as 1-based because the API exposes parameters such as:

```text
?page=1&limit=10
```

Therefore the array offset is calculated as:

```text
(page - 1) * limit
```

### Task assignment

The assignment endpoint validates the input at the route boundary and delegates the actual task mutation to the service layer.

An already-assigned task returns `409 Conflict` rather than silently overwriting the existing assignee.

This preserves the existing assignment and makes the resource-state conflict explicit to API consumers.

---

## What I Would Test Next

With additional time, I would consider adding tests for:

- Invalid pagination values such as negative or non-numeric values
- Large pagination limits
- Additional date edge cases and timezone behavior
- Malformed JSON requests
- Concurrent assignment attempts
- Behavior around updating an assigned task
- More combinations of filters and pagination

I would also consider introducing a schema validation layer if the API were expected to grow.

---

## What Surprised Me

The pagination implementation initially appeared straightforward, but the use of a 1-based API page number with a zero-based array offset caused the first page to be skipped.

Writing the tests before changing the implementation made the problem immediately reproducible and provided confidence that the fix addressed the actual behavior.

---

## Questions Before Shipping to Production

Before deploying this API to production, I would clarify:

1. Should tasks support reassignment, and if so, what authorization rules should apply?
2. Should assignees reference users by ID rather than storing a display name?
3. What are the expected rules for pagination parameters?
4. Should task data persist across server restarts?
5. What authentication and authorization requirements should protect task operations?
6. What API rate limits and request-size limits are required?
7. What logging and monitoring should be used in production?
8. What are the expected error-response conventions across the API?

---

## License

This repository was created as a take-home assignment submission.
