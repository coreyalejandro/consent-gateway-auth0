export type VaultToken = {
  accessToken: string;
  scopes: string[];
  expiresAt: string;
};

export type VaultClient = {
  getToken: (agentId: string, service: string) => Promise<VaultToken>;
  revokeToken: (agentId: string, service: string) => Promise<void>;
  fetchScopes: (agentId: string, service: string) => Promise<string[]>;
};

export function createVaultClient(): VaultClient {
  return {
    async getToken() {
      throw new Error("Vault client not configured");
    },
    async revokeToken() {
      throw new Error("Vault client not configured");
    },
    async fetchScopes() {
      throw new Error("Vault client not configured");
    },
  };
}

