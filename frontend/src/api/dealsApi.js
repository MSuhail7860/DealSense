// DealSense Real Deals & Pipeline API
import { request, ML_API_BASE_URL, API_BASE_URL } from './api';

export async function getDeals(limit = 100, stage = null) {
  const query = new URLSearchParams();
  if (limit) query.set('limit', limit);
  if (stage) query.set('stage', stage);
  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    return await request(`${ML_API_BASE_URL}/deals${qs}`);
  } catch (error) {
    console.warn('Could not fetch deals from ML service, trying Backend:', error.message);
    try {
      return await request(`${API_BASE_URL}/api/v1/deals`);
    } catch {
      return [];
    }
  }
}

export async function getDealById(dealId) {
  try {
    return await request(`${ML_API_BASE_URL}/deals/${dealId}`);
  } catch {
    return request(`${API_BASE_URL}/api/v1/deals/${dealId}`);
  }
}

export async function createDeal(dealData) {
  return request(`${API_BASE_URL}/api/v1/deals`, {
    method: 'POST',
    body: JSON.stringify(dealData),
  });
}

export async function getContacts() {
  try {
    return await request(`${API_BASE_URL}/api/v1/contacts`);
  } catch {
    return [];
  }
}

export async function createContact(contactData) {
  return request(`${API_BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    body: JSON.stringify(contactData),
  });
}
