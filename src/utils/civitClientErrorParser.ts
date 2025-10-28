/**
 * Error parser for Civitai client validation errors
 */
export class CivitClientErrorParser {
  /**
   * Parses a Civitai validation error message and extracts the structured error data
   * @param errorMessage - The error message from Civitai API
   * @returns Object with parsed validation errors or null if not a validation error
   */
  static parse(error: Error): { errors: any[] } | null {
    try {
      if (!error?.message || !error.message.startsWith("Validation error:"))
        return null;

      // Extract the JSON array part after "Validation Error: "
      const jsonPart = error.message
        .substring("Validation error: ".length)
        .trim();

      // Parse the JSON array
      const parsedErrors = JSON.parse(jsonPart);

      // Return in the expected format
      return { errors: parsedErrors };
    } catch (parseError) {
      console.warn("Failed to parse validation error:", parseError);
      return null;
    }
  }
}
