export async function regionLoader({ request }) {
  const url = new URL(request.url);
  const provinceId = url.searchParams.get('province');
  const regencyId = url.searchParams.get('regency');
  const districtId = url.searchParams.get('district');

  // Fetch data from JSON file
  const response = await fetch('/data/indonesia_regions.json');
  const data = await response.json();

  // Get available options based on selections
  const provinces = data.provinces;
  const regencies = provinceId 
    ? data.regencies.filter(r => r.province_id === parseInt(provinceId))
    : [];
  const districts = regencyId
    ? data.districts.filter(d => d.regency_id === parseInt(regencyId))
    : [];

  // Get selected items
  const selectedProvince = provinceId 
    ? provinces.find(p => p.id === parseInt(provinceId))
    : null;
  const selectedRegency = regencyId
    ? data.regencies.find(r => r.id === parseInt(regencyId))
    : null;
  const selectedDistrict = districtId
    ? data.districts.find(d => d.id === parseInt(districtId))
    : null;

  return {
    provinces,
    regencies,
    districts,
    selectedProvince,
    selectedRegency,
    selectedDistrict,
    filters: {
      province: provinceId,
      regency: regencyId,
      district: districtId,
    }
  };
}
