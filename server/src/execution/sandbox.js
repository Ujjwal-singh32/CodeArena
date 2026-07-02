// import { spawn } from "child_process";
// import { writeFile, mkdir, rm } from "fs/promises";
// import { join } from "path";
// import { tmpdir } from "os";
// import { randomUUID } from "crypto";
// import { env } from "../config/env.js";

// const isWin = process.platform === "win32";
// const BIN = isWin ? "main.exe" : "./main";

// function getLangConfig(language) {
//   const configs = {
//     javascript: {
//       file: "main.js",
//       compile: false,
//       localRun: ["node", "main.js"],
//       dockerRun: "node main.js",
//     },
//     python: {
//       file: "main.py",
//       compile: false,
//       localRun: [isWin ? "python" : "python3", "main.py"],
//       dockerRun: "python3 main.py",
//     },
//     cpp: {
//       file: "main.cpp",
//       compile: true,
//       localCompile: ["g++", "-O2", "-std=c++17", "-o", isWin ? "main.exe" : "main", "main.cpp"],
//       localRun: isWin ? ["main.exe"] : ["./main"],
//       dockerCompile: "g++ -O2 -std=c++17 -o main main.cpp",
//       dockerRun: "./main",
//     },
//     c: {
//       file: "main.c",
//       compile: true,
//       localCompile: ["gcc", "-O2", "-o", isWin ? "main.exe" : "main", "main.c"],
//       localRun: isWin ? ["main.exe"] : ["./main"],
//       dockerCompile: "gcc -O2 -o main main.c",
//       dockerRun: "./main",
//     },
//     java: {
//       file: "Main.java",
//       compile: true,
//       localCompile: ["javac", "Main.java"],
//       localRun: ["java", "Main"],
//       dockerCompile: "javac Main.java",
//       dockerRun: "java Main",
//     },
//   };
//   return configs[language] || configs.javascript;
// }

// export async function executeCode({ code, language, input, timeLimitSec = 2, memoryLimitMb = 256 }) {
//   if (env.execution.enabled) {
//     const dockerResult = await executeInDocker({ code, language, input, timeLimitSec, memoryLimitMb });
//     if (isDockerUnavailable(dockerResult)) {
//       return executeLocally({ code, language, input, timeLimitSec });
//     }
//     return dockerResult;
//   }
//   return executeLocally({ code, language, input, timeLimitSec });
// }

// function isDockerUnavailable(result) {
//   const err = `${result.stderr || ""}${result.stdout || ""}`.toLowerCase();
//   return (
//     err.includes("docker") &&
//     (err.includes("cannot find the file") ||
//       err.includes("failed to connect") ||
//       err.includes("not found") ||
//       err.includes("daemon"))
//   );
// }

// async function executeLocally({ code, language, input, timeLimitSec }) {
//   const config = getLangConfig(language);
//   const workDir = join(tmpdir(), `codearena-${randomUUID()}`);

//   try {
//     await mkdir(workDir, { recursive: true });
//     await writeFile(join(workDir, config.file), code);
//     await writeFile(join(workDir, "input.txt"), input || "");

//     if (config.compile) {
//       const compileResult = await runProcess(config.localCompile, workDir, "", timeLimitSec * 1000);
//       if (compileResult.exitCode !== 0) {
//         return {
//           status: "COMPILATION_ERROR",
//           compileOutput: compileResult.stderr || compileResult.stdout,
//           stdout: "",
//           stderr: compileResult.stderr,
//           runtime: 0,
//           memory: 0,
//         };
//       }
//     }

//     const start = Date.now();
//     const result = await runProcess(config.localRun, workDir, input || "", timeLimitSec * 1000);
//     const runtime = Date.now() - start;

//     if (result.timedOut) {
//       return { status: "TIME_LIMIT_EXCEEDED", stdout: result.stdout, stderr: result.stderr, runtime, memory: 0 };
//     }
//     if (result.exitCode !== 0) {
//       return { status: "RUNTIME_ERROR", stdout: result.stdout, stderr: result.stderr, runtime, memory: 0 };
//     }

//     return {
//       status: "ACCEPTED",
//       stdout: result.stdout.trim(),
//       stderr: result.stderr,
//       runtime,
//       memory: 0,
//     };
//   } finally {
//     await rm(workDir, { recursive: true, force: true }).catch(() => {});
//   }
// }

// async function executeInDocker({ code, language, input, timeLimitSec, memoryLimitMb }) {
//   const config = getLangConfig(language);
//   const workDir = join(tmpdir(), `codearena-docker-${randomUUID()}`);

//   try {
//     await mkdir(workDir, { recursive: true });
//     await writeFile(join(workDir, config.file), code);
//     await writeFile(join(workDir, "input.txt"), input || "");

//     const shellCmd = config.compile
//       ? `${config.dockerCompile} 2>&1 && ${config.dockerRun} < input.txt`
//       : `${config.dockerRun} < input.txt`;

//     const dockerArgs = [
//       "run",
//       "--rm",
//       "--network",
//       "none",
//       "--memory",
//       `${memoryLimitMb}m`,
//       "--cpus",
//       "0.5",
//       "-w",
//       "/sandbox",
//       "-v",
//       `${workDir}:/sandbox`,
//       env.execution.sandboxImage,
//       "sh",
//       "-c",
//       shellCmd,
//     ];

//     const start = Date.now();
//     const result = await runProcess(["docker", ...dockerArgs], workDir, "", timeLimitSec * 1000);
//     const runtime = Date.now() - start;

//     const combinedErr = result.stderr || "";
//     const combinedOut = result.stdout || "";

//     if (result.timedOut) {
//       return { status: "TIME_LIMIT_EXCEEDED", stdout: combinedOut, stderr: combinedErr, runtime, memory: 0 };
//     }

//     if (config.compile && (combinedErr.includes("error:") || combinedOut.includes("error:")) && result.exitCode !== 0) {
//       return {
//         status: "COMPILATION_ERROR",
//         compileOutput: combinedErr || combinedOut,
//         stdout: combinedOut,
//         stderr: combinedErr,
//         runtime,
//         memory: 0,
//       };
//     }

//     if (result.exitCode !== 0) {
//       return { status: "RUNTIME_ERROR", stdout: combinedOut, stderr: combinedErr, runtime, memory: 0 };
//     }

//     return {
//       status: "ACCEPTED",
//       stdout: combinedOut.trim(),
//       stderr: combinedErr,
//       runtime,
//       memory: 0,
//     };
//   } finally {
//     await rm(workDir, { recursive: true, force: true }).catch(() => {});
//   }
// }

// function runProcess(cmd, cwd, stdin = "", timeoutMs = 5000) {
//   return new Promise((resolve) => {
//     const proc = spawn(cmd[0], cmd.slice(1), { cwd, shell: false });
//     let stdout = "";
//     let stderr = "";
//     let timedOut = false;

//     const timer = setTimeout(() => {
//       timedOut = true;
//       proc.kill("SIGKILL");
//     }, timeoutMs);

//     proc.stdout?.on("data", (d) => {
//       stdout += d.toString();
//     });
//     proc.stderr?.on("data", (d) => {
//       stderr += d.toString();
//     });

//     if (stdin) proc.stdin?.write(stdin);
//     proc.stdin?.end();

//     proc.on("close", (exitCode) => {
//       clearTimeout(timer);
//       resolve({ stdout, stderr, exitCode: exitCode ?? 1, timedOut });
//     });

//     proc.on("error", (err) => {
//       clearTimeout(timer);
//       resolve({ stdout, stderr: err.message, exitCode: 1, timedOut });
//     });
//   });
// }

// export async function judgeSubmission({ code, language, testCases, timeLimitSec, memoryLimitMb }) {
//   let passed = 0;
//   let lastResult = null;

//   for (const tc of testCases) {
//     const result = await executeCode({
//       code,
//       language,
//       input: tc.input,
//       timeLimitSec,
//       memoryLimitMb,
//     });

//     lastResult = result;

//     if (result.status !== "ACCEPTED") {
//       return {
//         status: result.status,
//         passedTestCases: passed,
//         totalTestCases: testCases.length,
//         stdout: result.stdout,
//         stderr: result.stderr,
//         compileOutput: result.compileOutput,
//         runtime: result.runtime,
//         memory: result.memory,
//       };
//     }

//     const actual = normalizeOutput(result.stdout);
//     const expected = normalizeOutput(tc.expectedOutput);

//     if (actual !== expected) {
//       return {
//         status: "WRONG_ANSWER",
//         passedTestCases: passed,
//         totalTestCases: testCases.length,
//         stdout: result.stdout,
//         stderr: result.stderr,
//         runtime: result.runtime,
//         memory: result.memory,
//         expectedOutput: tc.expectedOutput,
//       };
//     }

//     passed++;
//   }

//   return {
//     status: "ACCEPTED",
//     passedTestCases: passed,
//     totalTestCases: testCases.length,
//     stdout: lastResult?.stdout,
//     stderr: lastResult?.stderr,
//     runtime: lastResult?.runtime,
//     memory: lastResult?.memory,
//   };
// }

// function normalizeOutput(s) {
//   return (s || "").trim().replace(/\r\n/g, "\n");
// }
import fetch from "node-fetch";

// Defaulting to a local Judge0 instance or your hosted URL
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "http://localhost:2358";

// Judge0 Language IDs
const LANGUAGE_IDS = {
  javascript: 93, // Node.js
  python: 71,     // Python 3.8.1
  cpp: 54,        // GCC 9.2.0 C++
  c: 50,          // GCC 9.2.0 C
  java: 62,       // OpenJDK 13
  typescript: 74  // TypeScript 3.7.4
};

export async function judgeSubmission({ code, language, testCases, timeLimitSec = 2, memoryLimitMb = 256 }) {
  const language_id = LANGUAGE_IDS[language.toLowerCase()] || 93;

  // 1. Prepare batch payload for all test cases
  const submissions = testCases.map(tc => ({
    language_id,
    source_code: Buffer.from(code).toString('base64'),
    stdin: Buffer.from(tc.input || '').toString('base64'),
    expected_output: Buffer.from(tc.expectedOutput || '').toString('base64'),
    cpu_time_limit: timeLimitSec,
    memory_limit: memoryLimitMb * 1024, // Judge0 uses KB
  }));

  try {
    // 2. Send batch to Judge0
    const response = await fetch(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions })
    });

    if (!response.ok) {
      throw new Error(`Judge0 API error: ${await response.text()}`);
    }

    const tokens = await response.json();
    const tokenString = tokens.map(t => t.token).join(',');

    // 3. Poll for batch results
    let results = [];
    let pending = true;

    while (pending) {
      // 1-second delay prevents rate-limiting yourself against the Judge0 server
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollRes = await fetch(`${JUDGE0_API_URL}/submissions/batch?tokens=${tokenString}&base64_encoded=true&fields=status_id,compile_output,stdout,stderr,time,memory`);
      const pollData = await pollRes.json();

      results = pollData.submissions;
      // Status 1 = In Queue, Status 2 = Processing
      pending = results.some(r => r.status_id === 1 || r.status_id === 2);
    }

    // 4. Analyze results
    let passedCount = 0;
    let firstFailure = null;
    let maxTime = 0;
    let maxMemory = 0;

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const time = parseFloat(res.time || "0") * 1000;
      const memory = (res.memory || 0) / 1024;
      
      if (time > maxTime) maxTime = time;
      if (memory > maxMemory) maxMemory = memory;

      // Status 3 is 'Accepted' in Judge0
      if (res.status_id === 3) {
        passedCount++;
      } else if (!firstFailure) {
        firstFailure = {
          ...res,
          expectedOutput: testCases[i].expectedOutput
        };
      }
    }

    // All Test Cases Passed
    if (passedCount === testCases.length) {
      return {
        status: "ACCEPTED",
        passedTestCases: passedCount,
        totalTestCases: testCases.length,
        stdout: results[results.length - 1].stdout ? Buffer.from(results[results.length - 1].stdout, 'base64').toString('utf-8') : "",
        stderr: "",
        runtime: Math.round(maxTime),
        memory: Math.round(maxMemory),
      };
    }

    // Handle Failures
    const statusMap = {
      4: "WRONG_ANSWER",
      5: "TIME_LIMIT_EXCEEDED",
      6: "COMPILATION_ERROR",
      7: "RUNTIME_ERROR",
      8: "RUNTIME_ERROR",
      9: "RUNTIME_ERROR",
      10: "RUNTIME_ERROR",
      11: "RUNTIME_ERROR",
      12: "RUNTIME_ERROR",
      13: "INTERNAL_ERROR",
      14: "EXECUTION_FORMAT_ERROR"
    };

    const status = statusMap[firstFailure.status_id] || "RUNTIME_ERROR";

    return {
      status,
      passedTestCases: passedCount,
      totalTestCases: testCases.length,
      stdout: firstFailure.stdout ? Buffer.from(firstFailure.stdout, 'base64').toString('utf-8') : "",
      stderr: firstFailure.stderr ? Buffer.from(firstFailure.stderr, 'base64').toString('utf-8') : "",
      compileOutput: firstFailure.compile_output ? Buffer.from(firstFailure.compile_output, 'base64').toString('utf-8') : "",
      runtime: Math.round(maxTime),
      memory: Math.round(maxMemory),
      expectedOutput: firstFailure.expectedOutput,
    };

  } catch (err) {
    console.error("Judge0 Execution Error:", err);
    return {
      status: "RUNTIME_ERROR",
      passedTestCases: 0,
      totalTestCases: testCases.length,
      stdout: "",
      stderr: "Judge0 connection failed or timed out.",
      runtime: 0,
      memory: 0
    };
  }
}