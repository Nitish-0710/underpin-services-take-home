# Bug Report

## Bug: Pagination skips the first page of tasks

### Location

`task-api/src/services/taskService.js`

### Affected functionality

`GET /tasks?page=<page>&limit=<limit>`

The pagination service calculates the offset using:

```js
const offset = page * limit;
```

The API treats page numbers as 1-based, so the first page should start at index `0`.

### Steps to reproduce

1. Create at least four tasks.
2. Request the first page:

```http
GET /tasks?page=1&limit=2
```

3. Request the second page:

```http
GET /tasks?page=2&limit=2
```

### Expected behavior

For four tasks:

```text
Page 1 → Task 1, Task 2
Page 2 → Task 3, Task 4
```

### Actual behavior

The current implementation calculates:

```text
page 1, limit 2 → offset 2
page 2, limit 2 → offset 4
```

Therefore:

```text
Page 1 → Task 3, Task 4
Page 2 → empty array
```

The behavior was reproduced by automated unit tests in:

`task-api/tests/taskService.test.js`

The tests failed with:

```text
Expected: ["Task 1", "Task 2"]
Received: ["Task 3", "Task 4"]

Expected: ["Task 3", "Task 4"]
Received: []
```

### Root cause

The pagination calculation uses the page number directly as a zero-based array offset.

For a 1-based page number, the offset should be:

```text
(page - 1) * limit
```

### Fix

Change:

```js
const offset = page * limit;
```

to:

```js
const offset = (page - 1) * limit;
```

### Verification

The existing pagination tests are designed to fail against the original implementation and pass after the fix.

The fix will be verified by running the complete test suite after the change.

### Impact

Requests for paginated task lists return incorrect results whenever pagination parameters are supplied. The first page skips the first `limit` tasks, and subsequent pages are shifted forward.

This can cause clients consuming the paginated API to miss tasks or receive incomplete result sets.
