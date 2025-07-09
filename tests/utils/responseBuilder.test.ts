import { ResponseBuilder } from "../../src/utils/responseBuilder";

describe("ResponseBuilder", () => {
  describe("success", () => {
    it("should return success response with data", () => {
      const data = { message: "test" };
      const response = ResponseBuilder.success(data);

      expect(response.status).toBe(200);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(response.body).toBe(JSON.stringify(data));
    });

    it("should return success response without data", () => {
      const response = ResponseBuilder.success();

      expect(response.status).toBe(200);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(response.body).toBeUndefined();
    });

    it("should return success response with custom status", () => {
      const response = ResponseBuilder.success({ test: true }, 201);

      expect(response.status).toBe(201);
    });
  });

  describe("successMessage", () => {
    it("should return success message response", () => {
      const message = "Operation completed";
      const response = ResponseBuilder.successMessage(message);

      expect(response.status).toBe(200);
      expect(response.body).toBe(message);
    });

    it("should return success message with custom status", () => {
      const response = ResponseBuilder.successMessage("Created", 201);

      expect(response.status).toBe(201);
      expect(response.body).toBe("Created");
    });
  });

  describe("error", () => {
    it("should return error response", () => {
      const message = "Something went wrong";
      const response = ResponseBuilder.error(message);

      expect(response.status).toBe(500);
      expect(response.body).toBe(message);
    });

    it("should return error response with custom status", () => {
      const response = ResponseBuilder.error("Bad request", 400);

      expect(response.status).toBe(400);
      expect(response.body).toBe("Bad request");
    });
  });

  describe("jsonError", () => {
    it("should return JSON error response", () => {
      const error = "Validation failed";
      const response = ResponseBuilder.jsonError(error);

      expect(response.status).toBe(500);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(response.body).toBe(JSON.stringify({ error }));
    });

    it("should return JSON error response with details", () => {
      const error = "Validation failed";
      const details = "Field 'name' is required";
      const response = ResponseBuilder.jsonError(error, details);

      expect(response.body).toBe(JSON.stringify({ error, details }));
    });

    it("should return JSON error response with custom status", () => {
      const response = ResponseBuilder.jsonError("Not found", undefined, 404);

      expect(response.status).toBe(404);
    });
  });

  describe("unauthorized", () => {
    it("should return unauthorized response with default message", () => {
      const response = ResponseBuilder.unauthorized();

      expect(response.status).toBe(401);
      expect(response.body).toBe("Unauthorized. No user ID found.");
    });

    it("should return unauthorized response with custom message", () => {
      const message = "Invalid token";
      const response = ResponseBuilder.unauthorized(message);

      expect(response.status).toBe(401);
      expect(response.body).toBe(message);
    });
  });

  describe("badRequest", () => {
    it("should return bad request response", () => {
      const message = "Invalid input";
      const response = ResponseBuilder.badRequest(message);

      expect(response.status).toBe(400);
      expect(response.body).toBe(message);
    });
  });

  describe("notFound", () => {
    it("should return not found response with default message", () => {
      const response = ResponseBuilder.notFound();

      expect(response.status).toBe(404);
      expect(response.body).toBe("Resource not found.");
    });

    it("should return not found response with custom message", () => {
      const message = "Blob not found";
      const response = ResponseBuilder.notFound(message);

      expect(response.status).toBe(404);
      expect(response.body).toBe(message);
    });
  });

  describe("invalidJson", () => {
    it("should return invalid JSON response", () => {
      const response = ResponseBuilder.invalidJson();

      expect(response.status).toBe(400);
      expect(response.body).toBe("Invalid JSON format in request body.");
    });
  });
});
