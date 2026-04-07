# ConsentChain demo video script

## Video script: ConsentChain Action Gateway

This script showcases the **Action Gateway** extraction with **Auth0-backed, connection-scoped token issuance** (RFC 8693 token exchange after explicit consent), aligned with the hackathon criteria (Security, User Control, Technical Execution).

---

**Duration:** ~2:50 | **Goal:** Show the "Empirical Safety" of the 7-stage gateway.

### **0:00 - 0:30 | The Problem & The Pivot**

* **Visual:** Show the original [consentchain repository](https://github.com/coreyalejandro/consentchain).
* **Audio:** "AI agents are moving from chatbots to autonomous actors, but they often have too much power. Most frameworks store sensitive API keys in the prompt context, creating a massive security hole. We built **ConsentChain** to fix this. For this hackathon, we’ve extracted our core **Action Gateway** into a modular, standalone product that uses **Auth0** to bind the user session to a declared **connection**, then issues short-lived provider access **server-side** after consent—credentials never go to the agent or the LLM context. See [Auth0 Token Vault / AI docs](https://auth0.com/ai/docs/intro/token-vault) for how Auth0 supports brokered token flows in this space."

### **0:30 - 1:15 | Technical Architecture (The 7 Stages)**

* **Visual:** Screen recording of your `component-inventory.json` and `COMPONENTS.schema.json` (note each tool’s `connection`, `audience`, and `risk`).
* **Audio:** "Our architecture is built on a modular 'Empirical Safety' model. Everything is governed by a strict schema. We’ve implemented a 7-stage pipeline. When an agent wants to act—like sending an email—our gateway intercepts the intent. It doesn't just check if the agent *can* do it; it asks if the human *wants* it done right now. We use `@auth0/ai-langchain` where it fits the agent side; the gateway itself enforces **session → connection → token exchange → consent** before any provider token exists."

### **1:15 - 2:15 | The Live Demo (Auth0 in Action)**

* **Visual:** Open your local app (`localhost:3000`). Trigger a "High Stakes" action.
* **Audio:** "Let’s see it in action. Here, the agent attempts to access a user's Gmail. Notice the Gateway immediately intercepts this. Stages 1 through 3 validate the risk. Now, in Stage 4, the user sees a clear, transparent consent prompt. This is **User Control** in practice.
* **Visual:** Click 'Approve'. Show metadata returned (not the raw token)—e.g. success panel or network tab showing `{ ok, meta }` only.
* **Audio:** "Once I click approve, we hit Stage 5: **connection-scoped issuance**. The server uses the Auth0 session to get a **subject token**, then performs **token exchange** for that **connection** and API **audience**. The provider token never appears in the browser; only metadata does. The agent never 'knew' the password, and the secret never touched the LLM's memory."

### **2:15 - 2:50 | Impact & Conclusion**

* **Visual:** Show the [extracted repository on GitHub](https://github.com/coreyalejandro/consent-gateway-auth0).
* **Audio:** "By modularizing this gateway, we’ve created a plug-and-play security layer for any AI developer. Using [Auth0 for AI Agents](https://authorizedtoact.devpost.com/rules) allowed us to solve the 'Trust Gap,' moving from hope-based safety to verifiable, empirical governance. We’re excited to see how this changes the way we build autonomous systems. Thanks for watching!"

---

## Recording Tips for the Judges

* **Show the Auth0 Dashboard:** A short clip of **Authentication → Social / Enterprise connections** (matching your inventory `connection` names) and **APIs** (subject audience) plus token-exchange / application settings helps prove backend configuration—more concrete than a generic "Token Vault" label alone.
* **Scannability:** In the video, use text overlays for the "7 Stages" as you talk through them. Judges love clear visual signposts.
* **Standalone Proof:** Briefly mention that this is the **extracted repo** to show you followed the hackathon's "Modular Architecture" preference.
