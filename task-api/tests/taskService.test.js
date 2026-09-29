const taskService = require("../src/services/taskService");

describe("taskService", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("create", () => {
    test("creates a task with default values", () => {
      const task = taskService.create({
        title: "Learn Jest",
      });

      expect(task).toMatchObject({
        title: "Learn Jest",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        completedAt: null,
      });

      expect(task.id).toEqual(expect.any(String));
      expect(task.createdAt).toEqual(expect.any(String));
    });

    test("creates a task with supplied values", () => {
      const task = taskService.create({
        title: "Build API",
        description: "Take-home assignment",
        status: "in_progress",
        priority: "high",
        dueDate: "2026-10-01T00:00:00.000Z",
      });

      expect(task).toMatchObject({
        title: "Build API",
        description: "Take-home assignment",
        status: "in_progress",
        priority: "high",
        dueDate: "2026-10-01T00:00:00.000Z",
        completedAt: null,
      });
    });
  });

  describe("getAll", () => {
    test("returns all tasks", () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
      expect(tasks.map((task) => task.title)).toEqual(["Task 1", "Task 2"]);
    });

    test("returns an empty array when there are no tasks", () => {
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe("findById", () => {
    test("returns the task when the id exists", () => {
      const created = taskService.create({ title: "Find me" });

      expect(taskService.findById(created.id)).toEqual(created);
    });

    test("returns undefined when the id does not exist", () => {
      expect(taskService.findById("non-existent-id")).toBeUndefined();
    });
  });

  describe("getByStatus", () => {
    test("returns tasks matching the requested status", () => {
      taskService.create({
        title: "Todo task",
        status: "todo",
      });

      taskService.create({
        title: "Done task",
        status: "done",
      });

      expect(taskService.getByStatus("todo")).toHaveLength(1);
      expect(taskService.getByStatus("todo")[0].title).toBe("Todo task");
    });
  });

  describe("getPaginated", () => {
    test("returns the first page of tasks", () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });
      taskService.create({ title: "Task 3" });
      taskService.create({ title: "Task 4" });

      expect(taskService.getPaginated(1, 2).map((task) => task.title)).toEqual([
        "Task 1",
        "Task 2",
      ]);
    });

    test("returns the second page of tasks", () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });
      taskService.create({ title: "Task 3" });
      taskService.create({ title: "Task 4" });

      expect(taskService.getPaginated(2, 2).map((task) => task.title)).toEqual([
        "Task 3",
        "Task 4",
      ]);
    });
  });

  describe("getStats", () => {
    test("counts tasks by status", () => {
      taskService.create({ title: "Todo 1", status: "todo" });
      taskService.create({ title: "Todo 2", status: "todo" });
      taskService.create({ title: "Progress", status: "in_progress" });
      taskService.create({ title: "Done", status: "done" });

      expect(taskService.getStats()).toMatchObject({
        todo: 2,
        in_progress: 1,
        done: 1,
      });
    });

    test("counts overdue incomplete tasks", () => {
      taskService.create({
        title: "Overdue",
        status: "todo",
        dueDate: "2020-01-01T00:00:00.000Z",
      });

      taskService.create({
        title: "Completed overdue",
        status: "done",
        dueDate: "2020-01-01T00:00:00.000Z",
      });

      expect(taskService.getStats().overdue).toBe(1);
    });
  });

  describe("update", () => {
    test("updates an existing task", () => {
      const task = taskService.create({
        title: "Original title",
      });

      const updated = taskService.update(task.id, {
        title: "Updated title",
        priority: "high",
      });

      expect(updated).toMatchObject({
        id: task.id,
        title: "Updated title",
        priority: "high",
      });
    });

    test("returns null when updating a non-existent task", () => {
      expect(
        taskService.update("non-existent-id", {
          title: "Updated",
        })
      ).toBeNull();
    });
  });

  describe("remove", () => {
    test("removes an existing task", () => {
      const task = taskService.create({
        title: "Delete me",
      });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test("returns false for a non-existent task", () => {
      expect(taskService.remove("non-existent-id")).toBe(false);
    });
  });

  describe("completeTask", () => {
    test("marks a task as done", () => {
      const task = taskService.create({
        title: "Complete me",
        priority: "high",
      });

      const completed = taskService.completeTask(task.id);

      expect(completed).toMatchObject({
        id: task.id,
        status: "done",
        priority: "medium",
      });

      expect(completed.completedAt).toEqual(expect.any(String));
    });

    test("returns null for a non-existent task", () => {
      expect(taskService.completeTask("non-existent-id")).toBeNull();
    });
  });

  describe("assignTask", () => {
    test("assigns a task to a user", () => {
      const task = taskService.create({
        title: "Assign me",
      });

      const assigned = taskService.assignTask(task.id, "Alice");

      expect(assigned).toMatchObject({
        id: task.id,
        title: "Assign me",
        assignee: "Alice",
      });
    });

    test("returns null when the task does not exist", () => {
      expect(taskService.assignTask("non-existent-id", "Alice")).toBeNull();
    });

    test("returns the already-assigned task without changing the assignee", () => {
      const task = taskService.create({
        title: "Already assigned",
      });

      taskService.assignTask(task.id, "Alice");

      const result = taskService.assignTask(task.id, "Bob");

      expect(result).toMatchObject({
        id: task.id,
        assignee: "Alice",
      });
    });
  });
});
