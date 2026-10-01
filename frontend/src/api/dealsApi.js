// DealSense Deals & Contacts API
import { request, API_BASE_URL } from './api';

export async function getDeals() {
  try {
    return await request(`${API_BASE_URL}/api/v1/deals`);
  } catch (error) {
    console.warn('Could not fetch deals from backend:', error.message);
    return [];
  }
}

export async function getDealById(dealId) {
  return request(`${API_BASE_URL}/api/v1/deals/${dealId}`);
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
