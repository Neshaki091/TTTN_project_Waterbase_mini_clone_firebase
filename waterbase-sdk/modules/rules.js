/**
 * Waterbase SDK v3.0 - Rules Module
 * Permission management
 */

class RulesModule {
    constructor(client) {
        this.client = client;
    }

    async getRules(role) {
        const response = await this.client.get(`/api/v1/rules/${this.client.config.appId}/${role}`);
        return response.data || response;
    }

    async updateRules(role, rules) {
        const response = await this.client.put(`/api/v1/rules/${this.client.config.appId}/${role}`, { rules });
        return response.data || response;
    }
}

export default RulesModule;
