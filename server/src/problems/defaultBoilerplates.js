export const DEFAULT_BOILERPLATES = {
  javascript: `const fs = require('fs');
const input = fs.readFileSync('input.txt', 'utf8').trim();
// Read input, solve, print answer
`,
  python: `lines = open('input.txt').read().strip().split('\\n')
# Read input, solve, print answer
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    freopen("input.txt", "r", stdin);
    // Read input, solve, print answer
    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    freopen("input.txt", "r", stdin);
    // Read input, solve, print answer
    return 0;
}
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Read input, solve, print answer
    }
}
`,
};

export const ALL_CLIENT_LANGUAGES = ["javascript", "python", "cpp", "c", "java"];
