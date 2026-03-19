/**
 * regions.js – Standard business regions and continents with country codes.
 * Also exports getEffectiveCountries(rep) to compute the full country set for a rep.
 */

const REGIONS = {
  EMEA: {
    id: 'EMEA', name: 'EMEA', label: 'Europe, Middle East & Africa',
    countries: [
      'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','AM','AZ',
      'AE','BH','IQ','IR','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE',
      'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
    ]
  },
  APAC: {
    id: 'APAC', name: 'APAC', label: 'Asia Pacific',
    countries: [
      'CN','JP','KP','KR','MN','TW',
      'BN','KH','ID','LA','MY','MM','PH','SG','TH','TL','VN',
      'AF','BD','BT','IN','MV','NP','PK','LK',
      'KZ','KG','TJ','TM','UZ',
      'AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU'
    ]
  },
  NA: {
    id: 'NA', name: 'NA', label: 'North America',
    countries: ['CA','MX','US']
  },
  LATAM: {
    id: 'LATAM', name: 'LATAM', label: 'Latin America',
    countries: [
      'BZ','CR','SV','GT','HN','NI','PA',
      'AG','BB','CU','DM','DO','GD','HT','JM','KN','LC','TT','VC',
      'AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE'
    ]
  },
  MEA: {
    id: 'MEA', name: 'MEA', label: 'Middle East & Africa',
    countries: [
      'AE','BH','IQ','IR','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE',
      'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
    ]
  },
  ANZ: {
    id: 'ANZ', name: 'ANZ', label: 'Australia & New Zealand',
    countries: ['AU','NZ']
  }
};

const CONTINENTS = {
  europe: {
    id: 'europe', name: 'Europe',
    countries: ['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','AM','AZ']
  },
  asia: {
    id: 'asia', name: 'Asia',
    countries: ['AF','AM','AZ','BH','BD','BT','BN','KH','CN','GE','IN','ID','IR','IQ','IL','JP','JO','KZ','KP','KR','KW','KG','LA','LB','MY','MV','MN','MM','NP','OM','PK','PS','PH','QA','SA','SG','LK','SY','TW','TJ','TH','TL','TM','TR','AE','UZ','VN','YE']
  },
  north_america: {
    id: 'north_america', name: 'North America',
    countries: ['CA','MX','US','BZ','CR','SV','GT','HN','NI','PA','AG','BB','CU','DM','DO','GD','HT','JM','KN','LC','TT','VC']
  },
  central_america: {
    id: 'central_america', name: 'Central America',
    countries: ['BZ','CR','SV','GT','HN','NI','PA']
  },
  south_america: {
    id: 'south_america', name: 'South America',
    countries: ['AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE']
  },
  africa: {
    id: 'africa', name: 'Africa',
    countries: ['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW']
  },
  middle_east: {
    id: 'middle_east', name: 'Middle East',
    countries: ['AE','BH','IQ','IR','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE']
  },
  oceania: {
    id: 'oceania', name: 'Oceania',
    countries: ['AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU']
  }
};

/**
 * Compute the full effective country list for a rep.
 * Combines individual countries + region expansions + continent expansions.
 */
function getEffectiveCountries(rep) {
  const set = new Set(rep.countries || []);
  for (const r of (rep.regions || [])) {
    const def = REGIONS[r.id];
    if (!def) continue;
    for (const c of def.countries) {
      if (!(r.exclusions || []).includes(c)) set.add(c);
    }
  }
  for (const ct of (rep.continents || [])) {
    const def = CONTINENTS[ct.id];
    if (!def) continue;
    for (const c of def.countries) {
      if (!(ct.exclusions || []).includes(c)) set.add(c);
    }
  }
  return [...set];
}

/**
 * Build a legend summary string for a rep, e.g.:
 *   "APAC (exc. 2) · Europe · IT · FR"
 */
function buildLegendSummary(rep) {
  const parts = [];
  for (const r of (rep.regions || [])) {
    const excCount = (r.exclusions || []).length;
    parts.push(excCount > 0 ? `${r.id} (exc. ${excCount})` : r.id);
  }
  for (const ct of (rep.continents || [])) {
    const def = CONTINENTS[ct.id];
    const excCount = (ct.exclusions || []).length;
    const label = def ? def.name : ct.id;
    parts.push(excCount > 0 ? `${label} (exc. ${excCount})` : label);
  }
  for (const c of (rep.countries || [])) {
    parts.push(c);
  }
  return parts.join(' · ');
}