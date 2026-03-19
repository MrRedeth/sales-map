/**
 * Store – fetches and saves sales rep data via the REST API.
 * All methods return Promises (async/await friendly).
 */
const Store = (() => {
  const BASE = '/api/salesreps';

  async function getSalesReps() {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error('Failed to load sales reps');
    return res.json();
  }

  async function getSalesRepById(id) {
    const reps = await getSalesReps();
    return reps.find(r => r.id === id) || null;
  }

  async function addSalesRep({ name, color, countries, regions, continents }) {
    const res = await fetch(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, color, countries: countries || [], regions: regions || [], continents: continents || [] })
    });
    if (!res.ok) throw new Error('Failed to add sales rep');
    return res.json();
  }

  async function updateSalesRep(id, { name, color, countries, regions, continents }) {
    const res = await fetch(`${BASE}/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, color, countries: countries || [], regions: regions || [], continents: continents || [] })
    });
    if (!res.ok) throw new Error('Failed to update sales rep');
    return res.json();
  }

  async function deleteSalesRep(id) {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete sales rep');
  }

  /** Returns { "IT": repObject, "DE": repObject, ... } using effective countries */
  async function getCountryRepMap() {
    const reps = await getSalesReps();
    const map  = {};
    reps.forEach(rep => {
      getEffectiveCountries(rep).forEach(code => { map[code] = rep; });
    });
    return map;
  }

  return { getSalesReps, getSalesRepById, addSalesRep, updateSalesRep, deleteSalesRep, getCountryRepMap };
})();