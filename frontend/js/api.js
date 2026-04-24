const API = {

  _base: '/api',

  _token: null,



  setToken(token) { this._token = token; localStorage.setItem('bom_api_token', token); },

  loadToken() { this._token = localStorage.getItem('bom_api_token'); },

  clearToken() { this._token = null; localStorage.removeItem('bom_api_token'); },



  _headers() {

    const h = { 'Content-Type': 'application/json' };

    if (this._token) h['Authorization'] = 'Bearer ' + this._token;

    return h;

  },



  async _fetch(method, path, body) {

    const opts = { method, headers: this._headers() };

    if (body) opts.body = JSON.stringify(body);

    const r = await fetch(this._base + path, opts);

    if (!r.ok) {

      // 401 未授权：Token 过期或无效，自动跳转到登录页

      if (r.status === 401) {

        this.clearToken();

        UI.toast('登录已过期，请重新登录', 'warning');

        setTimeout(function() { Router.navigate('login'); }, 1500);

        throw new Error('Unauthorized');

      }

      const e = await r.text();

      const err = new Error(e);

      err.status = r.status;

      throw err;

    }

    return r.status === 204 ? null : r.json();

  },



  // Auth

  async login(username, password) {

    const form = new URLSearchParams();

    form.append('username', username);

    form.append('password', password);

    const r = await fetch(this._base + '/auth/token', {

      method: 'POST',

      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },

      body: form

    });

    if (!r.ok) return null;

    const data = await r.json();

    this.setToken(data.access_token);

    return data;

  },



  async getMe() { return this._fetch('GET', '/auth/me'); },



  // Parts



  async getParts() { return this._fetch('GET', '/parts/'); },

  async getPart(id) { return this._fetch('GET', '/parts/' + id); },

  async createPart(data) { return this._fetch('POST', '/parts/', data); },

  async updatePart(id, data) { return this._fetch('PUT', '/parts/' + id, data); },

  async deletePart(id) { return this._fetch('DELETE', '/parts/' + id); },



  // Assemblies

  async getAssemblies() { return this._fetch('GET', '/assemblies/'); },

  async getAssembly(id) { return this._fetch('GET', '/assemblies/' + id); },

  async createAssembly(data) { return this._fetch('POST', '/assemblies/', data); },

  async updateAssembly(id, data) { return this._fetch('PUT', '/assemblies/' + id, data); },

  async deleteAssembly(id) { return this._fetch('DELETE', '/assemblies/' + id); },

  async getAssemblyParts(id) { return this._fetch('GET', '/assemblies/' + id + '/parts'); },

  async getAllBomItems() { return this._fetch('GET', '/bom/items/all'); },

  async addAssemblyPart(id, data) { return this._fetch('POST', '/assemblies/' + id + '/parts', data); },

  async updateAssemblyPart(asmId, itemId, data) { return this._fetch('PUT', '/assemblies/' + asmId + '/parts/' + itemId, data); },

  async removeAssemblyPart(asmId, itemId) { return this._fetch('DELETE', '/assemblies/' + asmId + '/parts/' + itemId); },



  // Users

  async getUsers() { return this._fetch('GET', '/users/'); },

  async getUser(id) { return this._fetch('GET', '/users/' + id); },

  async createUser(data) { return this._fetch('POST', '/users/', data); },

  async updateUser(id, data) { this._fetch('PUT', '/users/' + id, data); },  // 用户更新无返回

  async deleteUser(id) { return this._fetch('DELETE', '/users/' + id); },



  // Logs

  async getLogs() { return this._fetch('GET', '/logs/'); },



  // Dictionary

  async getDict(dictType) { return this._fetch('GET', '/dict/' + dictType); },

  async createDict(dictType, value) { return this._fetch('POST', '/dict/' + dictType, { value: value }); },

  async updateDict(dictType, id, value) { return this._fetch('PUT', '/dict/' + dictType + '/' + id, { value: value }); },

  async deleteDict(dictType, id) { return this._fetch('DELETE', '/dict/' + dictType + '/' + id); },

  // Custom Fields
  async getCustomFieldDefinitions(appliesTo) {
    var path = '/custom-fields/definitions/';
    if (appliesTo) path += '?applies_to=' + appliesTo;
    return this._fetch('GET', path);
  },
  async createCustomFieldDefinition(data) { return this._fetch('POST', '/custom-fields/definitions/', data); },
  async updateCustomFieldDefinition(id, data) { return this._fetch('PUT', '/custom-fields/definitions/' + id, data); },
  async deleteCustomFieldDefinition(id) { return this._fetch('DELETE', '/custom-fields/definitions/' + id); },
  async reorderCustomFieldDefinitions(items) { return this._fetch('PUT', '/custom-fields/definitions/reorder', { items: items }); },
  async getCustomFieldValues(entityType, entityId) { return this._fetch('GET', '/custom-fields/values/' + entityType + '/' + entityId); },
  async setCustomFieldValues(entityType, entityId, values) { return this._fetch('PUT', '/custom-fields/values/' + entityType + '/' + entityId, { values: values }); },
  async resetBusinessData() { return this._fetch('POST', '/custom-fields/reset-data'); },

  // Attachments v3.0
  async listAttachments() {
    return this._fetch('GET', '/attachments/');
  },
  async uploadAttachment(fileName, fileData) {
    if (fileData && fileData.indexOf(',') !== -1) {
      fileData = fileData.split(',')[1];
    }
    return this._fetch('POST', '/attachments/', {
      file_name: fileName,
      file_data: fileData
    });
  },
  async getAttachment(attachmentId) {
    return this._fetch('GET', '/attachments/' + attachmentId);
  },
  async deleteAttachment(attachmentId) {
    return this._fetch('DELETE', '/attachments/' + attachmentId);
  },

  // 全量同步（手动）

  async syncAll(parts, assemblies) {

    const results = { parts: { created: 0, updated: 0, errors: [] }, assemblies: { created: 0, updated: 0, errors: [] } };

    for (const p of parts) {

      try {

        const all = await this.getParts().catch(() => []);

        const match = all.find(x => x.code === p.code);

        if (match) {

          await this.updatePart(match.id, { name: p.name, spec: p.spec, price: p.price, stock: p.stock, status: p.status, remark: p.remark });

          results.parts.updated++;

        } else {

          await this.createPart({ code: p.code, name: p.name, spec: p.spec, price: p.price, stock: p.stock, status: p.status, remark: p.remark });

          results.parts.created++;

        }

      } catch (e) { results.parts.errors.push(p.code + ': ' + e.message); }

    }

    for (const c of assemblies) {

      try {

        const all = await this.getAssemblies().catch(() => []);

        const match = all.find(x => x.code === c.code);

        if (match) {

          await this.updateAssembly(match.id, { name: c.name, spec: c.spec, version: c.version, price: c.price, status: c.status, remark: c.remark });

          results.assemblies.updated++;

        } else {

          await this.createAssembly({ code: c.code, name: c.name, spec: c.spec, version: c.version, price: c.price, status: c.status, remark: c.remark });

          results.assemblies.created++;

        }

      } catch (e) { results.assemblies.errors.push(c.code + ': ' + e.message); }

    }

    return results;

  }

};

// 启动时恢复 API token
API.loadToken();
