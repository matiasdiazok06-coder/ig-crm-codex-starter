import fetch from 'node-fetch';
import { CONFIG } from '../config.js';

export class GraphError extends Error {
  constructor(message, info) {
    super(message);
    this.name = 'GraphError';
    this.info = info;
  }
}

export async function graph(path, params = {}, { method = 'GET', accessToken } = {}) {
  const url = new URL(`https://graph.facebook.com/${CONFIG.apiVersion}${path}`);
  if (method === 'GET') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  const options = { method, headers };

  if (method !== 'GET') {
    options.body = JSON.stringify(params);
  }

  if (accessToken) {
    url.searchParams.set('access_token', accessToken);
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();
  if (!response.ok) {
    throw new GraphError(data.error?.message || 'Graph error', data);
  }
  return data;
}
