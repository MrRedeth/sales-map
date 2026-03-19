/**
 * regions-data.js – Region and continent definitions for server-side use.
 */
const REGIONS = {
  EMEA: { id:'EMEA', countries:['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','AM','AZ','AE','BH','IQ','IR','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE','DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'] },
  APAC: { id:'APAC', countries:['CN','JP','KP','KR','MN','TW','BN','KH','ID','LA','MY','MM','PH','SG','TH','TL','VN','AF','BD','BT','IN','MV','NP','PK','LK','KZ','KG','TJ','TM','UZ','AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU'] },
  NA:   { id:'NA',   countries:['CA','MX','US'] },
  LATAM:{ id:'LATAM',countries:['BZ','CR','SV','GT','HN','NI','PA','AG','BB','CU','DM','DO','GD','HT','JM','KN','LC','TT','VC','AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE'] },
  MEA:  { id:'MEA',  countries:['AE','BH','IQ','IR','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE','DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'] },
  ANZ:  { id:'ANZ',  countries:['AU','NZ'] }
};

const CONTINENTS = {
  europe:         { id:'europe',         countries:['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','AM','AZ'] },
  asia:           { id:'asia',           countries:['AF','AM','AZ','BH','BD','BT','BN','KH','CN','GE','IN','ID','IR','IQ','IL','JP','JO','KZ','KP','KR','KW','KG','LA','LB','MY','MV','MN','MM','NP','OM','PK','PS','PH','QA','SA','SG','LK','SY','TW','TJ','TH','TL','TM','TR','AE','UZ','VN','YE'] },
  north_america:  { id:'north_america',  countries:['CA','MX','US','BZ','CR','SV','GT','HN','NI','PA','AG','BB','CU','DM','DO','GD','HT','JM','KN','LC','TT','VC'] },
  central_america:{ id:'central_america',countries:['BZ','CR','SV','GT','HN','NI','PA'] },
  south_america:  { id:'south_america',  countries:['AR','BO','BR','CL','CO','EC','GY','PY','PE','SR','UY','VE'] },
  africa:         { id:'africa',         countries:['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'] },
  middle_east:    { id:'middle_east',    countries:['AE','BH','IQ','IR','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','YE'] },
  oceania:        { id:'oceania',        countries:['AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS','SB','TO','TV','VU'] }
};

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

module.exports = { REGIONS, CONTINENTS, getEffectiveCountries };