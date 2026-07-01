import { spawn } from "child_process";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";

const isWin = process.platform === "win32";
const BIN = isWin ? "main.exe" : "./main";

function getLangConfig(language) {
  const configs = {
    javascript: {
      file: "main.js",
      compile: false,
      localRun: ["node", "main.js"],
      dockerRun: "node main.js",
    },
    python: {
      file: "main.py",
      compile: false,
      localRun: [isWin ? "python" : "python3", "main.py"],
      dockerRun: "python3 main.py",
    },
    cpp: {
      file: "main.cpp",
      compile: true,
      localCompile: ["g++", "-O2", "-std=c++17", "-o", isWin ? "main.exe" : "main", "main.cpp"],
      localRun: isWin ? ["main.exe"] : ["./main"],
      dockerCompile: "g++ -O2 -std=c++17 -o main main.cpp",
      dockerRun: "./main",
    },
    c: {
      file: "main.c",
      compile: true,
      localCompile: ["gcc", "-O2", "-o", isWin ? "main.exe" : "main", "main.c"],
      localRun: isWin ? ["main.exe"] : ["./main"],
      dockerCompile: "gcc -O2 -o main main.c",
      dockerRun: "./main",
    },
    java: {
      file: "Main.java",
      compile: true,
      localCompile: ["javac", "Main.java"],
      localRun: ["java", "Main"],
      dockerCompile: "javac Main.java",
      dockerRun: "java Main",
    },
  };
  return configs[language] || configs.javascript;
}

export async function executeCode({ code, language, input, timeLimitSec = 2, memoryLimitMb = 256 }) {
  if (env.execution.enabled) {
    return executeInDocker({ code, language, input, timeLimitSec, memoryLimitMb });
  }
  return executeLocally({ code, language, input, timeLimitSec });
}

async function executeLocally({ code, language, input, timeLimitSec }) {
  const config = getLangConfig(language);
  const workDir = join(tmpdir(), `codearena-${randomUUID()}`);

  try {
    await mkdir(workDir, { recursive: true });
    await writeFile(join(workDir, config.file), code);
    await writeFile(join(workDir, "input.txt"), input || "");

    if (config.compile) {
      const compileResult = await runProcess(config.localCompile, workDir, "", timeLimitSec * 1000);
      if (compileResult.exitCode !== 0) {
        return {
          status: "COMPILATION_ERROR",
          compileOutput: compileResult.stderr || compileResult.stdout,
          stdout: "",
          stderr: compileResult.stderr,
          runtime: 0,
          memory: 0,
        };
      }
    }

    const start = Date.now();
    const result = await runProcess(config.localRun, workDir, "", timeLimitSec * 1000);
    const runtime = Date.now() - start;

    if (result.timedOut) {
      return { status: "TIME_LIMIT_EXCEEDED", stdout: result.stdout, stderr: result.stderr, runtime, memory: 0 };
    }
    if (result.exitCode !== 0) {
      return { status: "RUNTIME_ERROR", stdout: result.stdout, stderr: result.stderr, runtime, memory: 0 };
    }

    return {
      status: "ACCEPTED",
      stdout: result.stdout.trim(),
      stderr: result.stderr,
      runtime,
      memory: 0,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function executeInDocker({ code, language, input, timeLimitSec, memoryLimitMb }) {
  const config = getLangConfig(language);
  const workDir = join(tmpdir(), `codearena-docker-${randomUUID()}`);

  try {
    await mkdir(workDir, { recursive: true });
    await writeFile(join(workDir, config.file), code);
    await writeFile(join(workDir, "input.txt"), input || "");

    const shellCmd = config.compile
      ? `${config.dockerCompile} 2>&1 && ${config.dockerRun} < input.txt`
      : `${config.dockerRun} < input.txt`;

    const dockerArgs = [
      "run",
      "--rm",
      "--network",
      "none",
      "--memory",
      `${memoryLimitMb}m`,
      "--cpus",
      "0.5",
      "-w",
      "/sandbox",
      "-v",
      `${workDir}:/sandbox`,
      env.execution.sandboxImage,
      "sh",
      "-c",
      shellCmd,
    ];

    const start = Date.now();
    const result = await runProcess(["docker", ...dockerArgs], workDir, "", timeLimitSec * 1000);
    const runtime = Date.now() - start;

    const combinedErr = result.stderr || "";
    const combinedOut = result.stdout || "";

    if (result.timedOut) {
      return { status: "TIME_LIMIT_EXCEEDED", stdout: combinedOut, stderr: combinedErr, runtime, memory: 0 };
    }

    if (config.compile && (combinedErr.includes("error:") || combinedOut.includes("error:")) && result.exitCode !== 0) {
      return {
        status: "COMPILATION_ERROR",
        compileOutput: combinedErr || combinedOut,
        stdout: combinedOut,
        stderr: combinedErr,
        runtime,
        memory: 0,
      };
    }

    if (result.exitCode !== 0) {
      return { status: "RUNTIME_ERROR", stdout: combinedOut, stderr: combinedErr, runtime, memory: 0 };
    }

    return {
      status: "ACCEPTED",
      stdout: combinedOut.trim(),
      stderr: combinedErr,
      runtime,
      memory: 0,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runProcess(cmd, cwd, stdin = "", timeoutMs = 5000) {
  return new Promise((resolve) => {
    const proc = spawn(cmd[0], cmd.slice(1), { cwd, shell: false });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);

    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });

    if (stdin) proc.stdin?.write(stdin);
    proc.stdin?.end();

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: exitCode ?? 1, timedOut });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: 1, timedOut });
    });
  });
}

export async function judgeSubmission({ code, language, testCases, timeLimitSec, memoryLimitMb }) {
  let passed = 0;
  let lastResult = null;

  for (const tc of testCases) {
    const result = await executeCode({
      code,
      language,
      input: tc.input,
      timeLimitSec,
      memoryLimitMb,
    });

    lastResult = result;

    if (result.status !== "ACCEPTED") {
      return {
        status: result.status,
        passedTestCases: passed,
        totalTestCases: testCases.length,
        stdout: result.stdout,
        stderr: result.stderr,
        compileOutput: result.compileOutput,
        runtime: result.runtime,
        memory: result.memory,
      };
    }

    const actual = normalizeOutput(result.stdout);
    const expected = normalizeOutput(tc.expectedOutput);

    if (actual !== expected) {
      return {
        status: "WRONG_ANSWER",
        passedTestCases: passed,
        totalTestCases: testCases.length,
        stdout: result.stdout,
        stderr: result.stderr,
        runtime: result.runtime,
        memory: result.memory,
        expectedOutput: tc.expectedOutput,
      };
    }

    passed++;
  }

  return {
    status: "ACCEPTED",
    passedTestCases: passed,
    totalTestCases: testCases.length,
    stdout: lastResult?.stdout,
    stderr: lastResult?.stderr,
    runtime: lastResult?.runtime,
    memory: lastResult?.memory,
  };
}

function normalizeOutput(s) {
  return (s || "").trim().replace(/\r\n/g, "\n");
}
