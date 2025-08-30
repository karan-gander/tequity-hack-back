export function cleanJsonString(str) {
    // Check for and remove the markdown code fences
    // if (str.startsWith('```json')) {
    //   str = str.substring(7); // Remove '```json'
    // }
    // if (str.endsWith('```')) {
    //   str = str.slice(0, -3); // Remove '```'
    // }

    const string  = str.replace(/```(json)?\s*/g, "").trim();

    return string; // Trim any leading/trailing whitespace
  }