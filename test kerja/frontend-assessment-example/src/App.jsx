import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom'
import { FaGlobeAsia, FaMapMarkedAlt, FaMap, FaBuilding, FaMapMarkerAlt } from 'react-icons/fa'
import { IoChevronDown, IoChevronForward } from 'react-icons/io5'
import { TbFilterX } from 'react-icons/tb'

function App() {
  const data = useLoaderData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleProvinceChange = (e) => {
    const value = e.target.value
    const params = new URLSearchParams()
    if (value) {
      params.set('province', value)
    }
    navigate(`/?${params.toString()}`, { replace: true })
  }

  const handleRegencyChange = (e) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('regency', value)
      params.delete('district')
    } else {
      params.delete('regency')
      params.delete('district')
    }
    navigate(`/?${params.toString()}`, { replace: true })
  }

  const handleDistrictChange = (e) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('district', value)
    } else {
      params.delete('district')
    }
    navigate(`/?${params.toString()}`, { replace: true })
  }

  const handleReset = () => {
    navigate('/', { replace: true })
  }

  const breadcrumbItems = ['Indonesia']
  if (data.selectedProvince) {
    breadcrumbItems.push(data.selectedProvince.name)
  }
  if (data.selectedRegency) {
    breadcrumbItems.push(data.selectedRegency.name)
  }
  if (data.selectedDistrict) {
    breadcrumbItems.push(data.selectedDistrict.name)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filter */}
          <aside className="w-80 bg-white rounded-lg shadow-sm p-6 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <FaGlobeAsia className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Frontend Assessment</h1>
            </div>

            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Filter Wilayah</h2>

              {/* Province Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Provinsi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FaMap className="w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    name="province"
                    value={data.filters.province || ''}
                    onChange={handleProvinceChange}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                  >
                    <option value="">Pilih Provinsi</option>
                    {data.provinces.map(province => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <IoChevronDown className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Regency Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kota/Kabupaten</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FaBuilding className="w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    name="regency"
                    value={data.filters.regency || ''}
                    onChange={handleRegencyChange}
                    disabled={!data.filters.province}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Pilih Kota/Kabupaten</option>
                    {data.regencies.map(regency => (
                      <option key={regency.id} value={regency.id}>
                        {regency.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <IoChevronDown className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* District Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kecamatan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    name="district"
                    value={data.filters.district || ''}
                    onChange={handleDistrictChange}
                    disabled={!data.filters.regency}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Pilih Kecamatan</option>
                    {data.districts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <IoChevronDown className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full px-4 py-2.5 border-2 border-blue-500 text-blue-500 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <TbFilterX className="w-5 h-5" />
              RESET
            </button>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Breadcrumb */}
            <nav className="breadcrumb mb-6">
              <ol className="flex items-center gap-2 text-sm text-gray-600">
                {breadcrumbItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {index > 0 && (
                      <IoChevronForward className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`${index === breadcrumbItems.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Province Section */}
            {data.selectedProvince && (
              <section className="mb-12">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Provinsi</span>
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-8">{data.selectedProvince.name}</h2>
              </section>
            )}

            {/* Regency Section */}
            {data.selectedRegency && (
              <section className="mb-12">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Kota / Kabupaten</span>
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-8">{data.selectedRegency.name}</h2>
              </section>
            )}

            {/* District Section */}
            {data.selectedDistrict && (
              <section className="mb-12">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Kecamatan</span>
                </div>
                <h2 className="text-5xl font-bold text-gray-900 mb-8">{data.selectedDistrict.name}</h2>
              </section>
            )}

            {/* Initial State */}
            {!data.selectedProvince && (
              <div className="text-center py-20">
                <FaMapMarkedAlt className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Pilih Provinsi untuk Memulai</h3>
                <p className="text-gray-500">Gunakan filter di sebelah kiri untuk memilih wilayah</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App

