# GenerateImage Function

The GenerateImage function allows users to generate images using the Civitai API. This function follows the same authentication and encryption patterns as other functions in the API.

## Endpoint

`POST /api/GenerateImage`

## Authentication

- Requires a valid JWT token in the `Authorization` header
- Requires a valid Civitai API key to be saved for the user
- Optional encryption key in the `x-encryption-key` header for encrypted Civitai keys

## Request Body

The request body should contain the image generation parameters:

```json
{
  "model": "urn:air:sdxl:checkpoint:civitai:257749@290640",
  "params": {
    "prompt": "A beautiful landscape with mountains and a lake",
    "negativePrompt": "blurry, low quality, distorted",
    "scheduler": "EULER_A",
    "steps": 20,
    "cfgScale": 7,
    "width": 1024,
    "height": 1024,
    "clipSkip": 2
  },
  "additionalNetworks": {
    "urn:air:sdxl:lora:civitai:479176@532904": {
      "strength": 0.8
    }
  }
}
```

### Parameters

- **model** (string, required): The Civitai model URN to use for generation
- **params** (object, required): Generation parameters
  - **prompt** (string, required): The main prompt for image generation
  - **negativePrompt** (string, required): The negative prompt to avoid certain elements
  - **scheduler** (string, required): The scheduler algorithm to use (e.g., "EULER_A")
  - **steps** (number, required): Number of generation steps
  - **cfgScale** (number, required): CFG scale for guidance
  - **width** (number, required): Image width in pixels
  - **height** (number, required): Image height in pixels
  - **clipSkip** (number, required): Number of CLIP layers to skip
- **additionalNetworks** (object, optional): Additional networks (LoRA, etc.) with their strengths

## Response

### Success Response (200)

```json
{
  "token": "abc123def456",
  "jobs": [
    {
      "jobId": "job-123",
      "cost": 0.05
    }
  ]
}
```

The response contains the full Civitai API response, including the token, job information, and cost details.

### Error Responses

- **400 Bad Request**: Missing or invalid parameters, or failed to generate image
- **401 Unauthorized**: Invalid or missing authentication token
- **500 Internal Server Error**: Server error during processing

## Example Usage

```javascript
const response = await fetch("/api/GenerateImage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
    "x-encryption-key": "your-encryption-key", // optional
  },
  body: JSON.stringify({
    model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
    params: {
      prompt: "A serene mountain landscape at sunset",
      negativePrompt: "blurry, low quality, distorted, text",
      scheduler: "EULER_A",
      steps: 15,
      cfgScale: 7,
      width: 1024,
      height: 1024,
      clipSkip: 2,
    },
    additionalNetworks: {},
  }),
});

const result = await response.json();
console.log("Full Civitai response:", result);
console.log("Generation token:", result.token);
console.log("Job details:", result.jobs);
```

## Prerequisites

1. User must have a valid Civitai API key saved using the `SaveCivitaiKey` function
2. User must be authenticated with a valid JWT token
3. The Civitai API key must have sufficient credits for image generation

## Blobs

- The function returns immediately with a token and does not wait for image completion
- Use the returned token with Civitai's API to check generation status and download the final image
- Generation costs depend on the model and parameters used
- The function validates all required parameters before making the API call
