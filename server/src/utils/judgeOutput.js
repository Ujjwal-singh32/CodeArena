export function formatJudgeMessage(status, details = {}) {
  const { compileOutput, stderr, stdout, passedTestCases, totalTestCases, expectedOutput } = details;

  switch (status) {
    case "COMPILATION_ERROR":
      return {
        message: "Compilation Error",
        detail: sanitizeCompileOutput(compileOutput || stderr || stdout || "Your code failed to compile."),
      };
    case "RUNTIME_ERROR":
      return {
        message: "Runtime Error",
        detail: sanitizeRuntimeOutput(stderr || stdout || "Program exited with an error."),
      };
    case "TIME_LIMIT_EXCEEDED":
      return {
        message: "Time Limit Exceeded",
        detail: "Your program took too long to execute.",
      };
    case "MEMORY_LIMIT_EXCEEDED":
      return {
        message: "Memory Limit Exceeded",
        detail: "Your program exceeded the memory limit.",
      };
    case "WRONG_ANSWER":
      return {
        message: "Wrong Answer",
        detail: `Your output:\n${stdout || "(empty)"}\n\nExpected:\n${expectedOutput || ""}`,
      };
    case "ACCEPTED":
      return {
        message: "Accepted",
        detail:
          passedTestCases != null
            ? `${passedTestCases}/${totalTestCases} test cases passed`
            : stdout || "",
      };
    default:
      return {
        message: status?.replace(/_/g, " ") || "Done",
        detail: stdout || stderr || compileOutput || "",
      };
  }
}

function sanitizeCompileOutput(raw) {
  if (!raw) return "Your code failed to compile.";
  return raw
    .split("\n")
    .filter((line) => !line.match(/^File "\/sandbox\//) && !line.match(/^  File "/))
    .join("\n")
    .trim() || "Your code failed to compile.";
}

function sanitizeRuntimeOutput(raw) {
  if (!raw) return "Program exited with an error.";
  if (raw.includes("Traceback")) {
    const lines = raw.split("\n").filter(Boolean);
    const lastLine = lines[lines.length - 1]?.trim();
    return lastLine || "Program crashed during execution.";
  }
  return raw
    .split("\n")
    .filter((line) => !line.match(/^File "\/sandbox\//))
    .join("\n")
    .trim() || "Program exited with an error.";
}

export function formatJudgeOutput(status, details = {}) {
  const { message, detail } = formatJudgeMessage(status, details);
  if (status === "ACCEPTED") {
    return `${message} — ${detail}`;
  }
  return `${message}\n\n${detail}`;
}
