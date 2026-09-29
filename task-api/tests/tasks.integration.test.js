const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("Task API integration tests", () => {
  beforeEach(() => {
    taskService._reset();
  });

  const createTask = (overrides = {}) =>
    request(app)
      .post("/tasks")
      .send({
        title: "Test task",
        ...overrides,
      });

  describe("POST /tasks", () => {
    test("creates a task with valid input", async () => {
      const response = await createTask({
        description: "Integration testing",
        priority: "high",
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Test task",
        description: "Integration testing",
        priority: "high",
        status: "todo",
      });
      expect(response.body.id).toEqual(expect.any(String));
    });

    test.each([
      [{}, "missing title"],
      [{ title: "" }, "empty title"],
      [{ title: "   " }, "whitespace-only title"],
      [{ title: 123 }, "non-string title"],
    ])("rejects %s (%s)", async (body) => {
      const response = await request(app).post("/tasks").send(body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("rejects invalid status", async () => {
      const response = await createTask({ status: "invalid" });
      expect(response.status).toBe(400);
    });

    test("rejects invalid priority", async () => {
      const response = await createTask({ priority: "urgent" });
      expect(response.status).toBe(400);
    });

    test("rejects invalid due date", async () => {
      const response = await createTask({
        dueDate: "not-a-date",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /tasks", () => {
    test("returns an empty array initially", async () => {
      const response = await request(app).get("/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("returns all created tasks", async () => {
      await createTask({ title: "First" });
      await createTask({ title: "Second" });

      const response = await request(app).get("/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test("filters tasks by status", async () => {
      await createTask({ title: "Pending", status: "todo" });
      await createTask({ title: "Finished", status: "done" });

      const response = await request(app)
        .get("/tasks")
        .query({ status: "done" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Finished");
    });

    test("returns the correct first page", async () => {
      for (let i = 1; i <= 4; i++) {
        await createTask({ title: `Task ${i}` });
      }

      const response = await request(app)
        .get("/tasks")
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.map((task) => task.title)).toEqual([
        "Task 1",
        "Task 2",
      ]);
    });

    test("returns the correct second page", async () => {
      for (let i = 1; i <= 4; i++) {
        await createTask({ title: `Task ${i}` });
      }

      const response = await request(app)
        .get("/tasks")
        .query({ page: 2, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.map((task) => task.title)).toEqual([
        "Task 3",
        "Task 4",
      ]);
    });
  });

  describe("GET /tasks/stats", () => {
    test("returns zero counts for an empty store", async () => {
      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test("returns task counts and overdue count", async () => {
      await createTask({
        status: "todo",
        dueDate: "2020-01-01T00:00:00.000Z",
      });
      await createTask({ status: "in_progress" });
      await createTask({ status: "done" });

      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe("PUT /tasks/:id", () => {
    test("updates an existing task", async () => {
      const created = await createTask();

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({ title: "Updated task", priority: "high" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        title: "Updated task",
        priority: "high",
      });
    });

    test("returns 404 for a missing task", async () => {
      const response = await request(app)
        .put("/tasks/missing-id")
        .send({ title: "Updated" });

      expect(response.status).toBe(404);
    });

    test("rejects invalid updates", async () => {
      const created = await createTask();

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({ priority: "invalid" });

      expect(response.status).toBe(400);
    });

    test("rejects empty title updates", async () => {
      const created = await createTask();

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({ title: "   " });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("deletes an existing task", async () => {
      const created = await createTask();

      const response = await request(app).delete(`/tasks/${created.body.id}`);

      expect(response.status).toBe(204);

      const tasks = await request(app).get("/tasks");
      expect(tasks.body).toHaveLength(0);
    });

    test("returns 404 when task does not exist", async () => {
      const response = await request(app).delete("/tasks/missing-id");

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("marks a task as completed", async () => {
      const created = await createTask();

      const response = await request(app).patch(
        `/tasks/${created.body.id}/complete`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("done");
      expect(response.body.completedAt).toEqual(expect.any(String));
    });

    test("returns 404 for a missing task", async () => {
      const response = await request(app).patch("/tasks/missing-id/complete");

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    test("assigns a task to a user", async () => {
      const created = await createTask();

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: "Alice" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        assignee: "Alice",
      });
    });

    test("returns 404 when the task does not exist", async () => {
      const response = await request(app)
        .patch("/tasks/missing-id/assign")
        .send({ assignee: "Alice" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "Task not found",
      });
    });

    test.each([
      [{}, "missing assignee"],
      [{ assignee: "" }, "empty assignee"],
      [{ assignee: "   " }, "whitespace-only assignee"],
      [{ assignee: 123 }, "non-string assignee"],
    ])("rejects %s (%s)", async (body) => {
      const created = await createTask();

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("returns 409 when the task is already assigned", async () => {
      const created = await createTask();

      await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: "Alice" });

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: "Bob" });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: "Task is already assigned",
      });
    });
  });
});
