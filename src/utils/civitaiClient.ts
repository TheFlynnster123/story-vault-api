// Utility for using Civitai API key and image generation
// This demonstrates how to retrieve and use the encrypted Civitai key

import { getCivitaiKeyRequest } from "../databaseRequests/getCivitaiKeyRequest";
import { Civitai, Scheduler } from "civitai";

/**
 * @typedef {Object} ImageGenerationParams
 * @property {string} prompt - The main prompt for image generation
 * @property {string} negativePrompt - The negative prompt to avoid certain elements
 * @property {string} scheduler - The scheduler algorithm to use
 * @property {number} steps - Number of generation steps
 * @property {number} cfgScale - CFG scale for guidance
 * @property {number} width - Image width in pixels
 * @property {number} height - Image height in pixels
 * @property {number} clipSkip - Number of CLIP layers to skip
 */

/**
 * @typedef {Object} AdditionalNetwork
 * @property {number} strength - Strength of the additional network (0.0 to 1.0)
 */

/**
 * @typedef {Object} ImageGenerationInput
 * @property {string} model - The Civitai model URN to use
 * @property {ImageGenerationParams} params - Generation parameters
 * @property {Object.<string, AdditionalNetwork>} additionalNetworks - Additional networks (LoRA, etc.)
 */

export interface ImageGenerationParams {
  prompt: string;
  negativePrompt: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  clipSkip: number;
}

export interface AdditionalNetwork {
  strength: number;
}

export interface ImageGenerationInput {
  model: string;
  params: ImageGenerationParams;
  additionalNetworks: Record<string, AdditionalNetwork>;
}

export class CivitaiClient {
  /**
   * Example function showing how to retrieve and use the Civitai API key
   * @param userId - The authenticated user ID
   * @param encryptionKey - The encryption key from request headers
   * @returns Promise<string | null> - Example API response or null if no key
   */
  static async exampleApiCall(
    userId: string,
    encryptionKey?: string
  ): Promise<string | null> {
    // Retrieve the decrypted Civitai key
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);

    if (!civitaiKey) {
      return null;
    }

    // Example: Use the key for Civitai API calls
    // In a real implementation, you would make actual HTTP requests to Civitai API
    // For example:
    // const response = await fetch('https://civitai.com/api/v1/models', {
    //   headers: {
    //     'Authorization': `Bearer ${civitaiKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    // return await response.json();

    // For demonstration purposes, just return a success message
    return `Successfully retrieved Civitai key for user ${userId}`;
  }

  /**
   * Validates if a user has a valid Civitai API key
   * @param userId - The authenticated user ID
   * @param encryptionKey - The encryption key from request headers
   * @returns Promise<boolean> - True if key exists, false otherwise
   */
  static async hasValidKey(
    userId: string,
    encryptionKey?: string
  ): Promise<boolean> {
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);
    return !!civitaiKey;
  }

  /**
   * Generates an image using the Civitai API
   * @param userId - The authenticated user ID
   * @param input - The image generation parameters
   * @param encryptionKey - The encryption key from request headers
   * @returns Promise<any | null> - The full Civitai response or null if failed
   */
  static async generateImage(
    userId: string,
    input: ImageGenerationInput,
    encryptionKey?: string
  ): Promise<any | null> {
    // Retrieve the decrypted Civitai key
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);

    if (!civitaiKey) {
      return null;
    }

    try {
      const civitai = new Civitai({
        auth: civitaiKey,
      });

      const response = await civitai.image.fromText(input, false);
      return response;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  }

  /**
   * Gets the status of a job using the Civitai API
   * @param userId - The authenticated user ID
   * @param jobId - The job ID to check status for
   * @param encryptionKey - The encryption key from request headers
   * @returns Promise<any | null> - The job status object or null if failed
   */
  static async getJobStatus(
    userId: string,
    jobId: string,
    encryptionKey?: string
  ): Promise<any | null> {
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);

    if (!civitaiKey) {
      return null;
    }

    try {
      const civitai = new Civitai({
        auth: civitaiKey,
      });

      const job = await civitai.jobs.getById(jobId);
      return job;
    } catch (error) {
      console.error("Error getting job status:", error);
      return null;
    }
  }
}
