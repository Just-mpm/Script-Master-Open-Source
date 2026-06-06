# Security Policy

## Supported Versions

Only the latest release is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.130.x | :white_check_mark: |
| < 0.130 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Script Master, please report it responsibly:

- **Email:** studio.kodaai@gmail.com
- **Response time:** We aim to acknowledge reports within 48 hours and provide an initial assessment within 5 business days.
- **Language:** English or Portuguese (pt-BR).

**Do not** open a public GitHub issue for security vulnerabilities.

### What to include in your report

1. A clear description of the vulnerability.
2. Steps to reproduce (if applicable).
3. The potential impact (e.g., data exposure, privilege escalation, denial of service).
4. Any suggested mitigations or fixes.

## Disclosure Policy

We follow **responsible disclosure**:

- Reports are kept confidential until a fix is released.
- We ask that reporters do not disclose the vulnerability publicly for **90 days** after reporting, or until a fix is available -- whichever comes first.
- We will credit the reporter in the fix commit (unless they prefer to remain anonymous).

## Scope

### In scope

- Cross-site scripting (XSS) in the Script Master frontend.
- Authentication or authorization bypasses in Firebase integration.
- Data leakage or unauthorized access to user data in Firestore or Storage.
- Vulnerabilities in the BYOK (Bring Your Own Key) flow (see below).
- Server-side request forgery (SSRF) in Cloud Functions.
- Injection vulnerabilities in prompts or user inputs that reach AI models.
- Any issue that compromises the confidentiality, integrity, or availability of user data.

### Out of scope

- Denial of service via excessive API calls to Gemini (the user controls their own API key and pays the provider directly).
- Vulnerabilities in third-party dependencies that are already disclosed and patched (report to the dependency maintainer instead).
- Issues in Firebase, Google Cloud, or other infrastructure services not controlled by this project.
- Social engineering attacks against project maintainers.
- Theoretical vulnerabilities without a practical exploit.

## BYOK (Bring Your Own Key) Security Model

Script Master uses a **Bring Your Own Key** model. Users provide their own Gemini API key (from Google AI Studio) to access AI features. This is a critical component of the security model:

### How API keys are handled

1. **Storage:** API keys are stored **exclusively in the user's browser** using IndexedDB, scoped by Firebase Auth UID. Keys are **never** written to Firestore, Firebase Storage, or any server-side database.

2. **Transmission:** On each AI call, the frontend sends the API key via `providerAuth.apiKey` in the HTTPS callable payload. The key travels over TLS-encrypted connections only.

3. **Backend usage:** The Cloud Functions backend initializes Genkit with `googleAI({ apiKey: false })` -- there is **no global API key**. Each request extracts the key via `extractApiKey(input)` and injects it per-call via `withApiKey(apiKey)` in `ai.generate()`. The key lives only in memory for the duration of the request.

4. **Logging:** API keys are masked in all server-side logs using `maskApiKeyForLog()`, which shows only the first and last 4 characters (e.g., `AIza...abcd`).

5. **Validation:** The `testApiKey` Cloud Function validates keys by making a minimal Gemini API call (`gemini-3.1-flash-lite`) to confirm the key works before storing it locally.

### Security considerations

- Users should treat their Gemini API key as a secret. Do not share it or commit it to version control.
- The project does not have access to, store, or process API keys beyond the lifetime of a single Cloud Function invocation.
- There is no billing, Stripe integration, or credit system -- users pay Google directly for Gemini API usage.

## Security Best Practices for Contributors

- Never log API keys, tokens, or user credentials in plaintext.
- Never commit `.env` files, service account keys, or other secrets.
- Use `import.meta.env` (not `process.env`) for environment variables in the frontend.
- All AI calls must go through Cloud Functions via `httpsCallable` -- never call Gemini directly from the frontend.
- Sanitize and validate all user inputs before passing them to AI models or database operations.
