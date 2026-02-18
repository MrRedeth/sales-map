/**
 * Store – manages sales rep data in localStorage.
 */
const Store = (() => {
  const KEY = 'salesMapData';

  function getData() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { salesReps: [] };
    } catch (e) {
      return { salesReps: [] };
    }
  }

  function saveData(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getSalesReps() {
    return getData().salesReps;
  }

  function getSalesRepById(id) {
    return getSalesReps().find(r => r.id === id) || null;
  }

  function addSalesRep({ name, color, countries }) {
    const data = getData();
    const rep = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      color,
      countries: countries || []
    };
    data.salesReps.push(rep);
    saveData(data);
    return rep;
  }

  function updateSalesRep(id, { name, color, countries }) {
    const data = getData();
    const idx = data.salesReps.findIndex(r => r.id === id);
    if (idx === -1) return null;
    data.salesReps[idx] = { id, name: name.trim(), color, countries: countries || [] };
    saveData(data);
    return data.salesReps[idx];
  }

  function deleteSalesRep(id) {
    const data = getData();
    data.salesReps = data.salesReps.filter(r => r.id !== id);
    saveData(data);
  }

  /** Returns { "IT": repObject, "DE": repObject, ... } */
  function getCountryRepMap() {
    const map = {};
    getSalesReps().forEach(rep => {
      (rep.countries || []).forEach(code => {
        map[code] = rep;
      });
    });
    return map;
  }

  return { getSalesReps, getSalesRepById, addSalesRep, updateSalesRep, deleteSalesRep, getCountryRepMap };
})();
