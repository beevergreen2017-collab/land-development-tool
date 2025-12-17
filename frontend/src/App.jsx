import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Calculator, Search, Save, Edit, Menu, X, List, CheckCircle, AlertTriangle } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8001'

// --- Constants & Config ---

const DISTRICTS = [
  '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區',
  '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'
]

const TAIPEI_ZONING_OPTIONS = [
  "住一", "住二", "住二之一", "住二之二", "住三", "住三之一", "住三之二", "住四", "住四之一",
  "商一", "商二", "商三", "商四",
  "工二", "工三",
  "行政", "文教", "風景", "保護", "農業", "特定專用"
]

const ZONING_RATES = {
  "住一": { coverage: 30, floor_area: 60 },
  "住二": { coverage: 35, floor_area: 120 },
  "住二之一": { coverage: 35, floor_area: 160 },
  "住二之二": { coverage: 35, floor_area: 225 },
  "住三": { coverage: 45, floor_area: 225 },
  "住三之一": { coverage: 45, floor_area: 300 },
  "住三之二": { coverage: 45, floor_area: 400 },
  "住四": { coverage: 50, floor_area: 300 },
  "住四之一": { coverage: 50, floor_area: 400 },
  "商一": { coverage: 55, floor_area: 360 },
  "商二": { coverage: 65, floor_area: 630 },
  "商三": { coverage: 65, floor_area: 560 },
  "商四": { coverage: 75, floor_area: 800 },
  "工二": { coverage: 55, floor_area: 200 },
  "工三": { coverage: 55, floor_area: 300 },
}

const CENTRAL_BONUS_ITEMS = {
  bonus_high_density: { title: "#5 高於基準容積部分", type: "input", unit: "%", note: "依公式核計" },
  structure_safety: { title: "#6 建築物結構安全", type: "input", unit: "%", note: "依評估結果" },
  donation_public: { title: "#7 捐贈公益設施", type: "input", unit: "%", note: "捐贈社福或公益設施" },
  assist_public_road: { title: "#8 協助開闢公設", type: "input", unit: "%", note: "取得及開闢公共設施用地" },
  historic_preservation: { title: "#9 文資保存與維護", type: "input", unit: "%", note: "歷史/紀念/藝術價值建築" },
  green_building: {
    title: "#10 綠建築設計", type: "radio",
    options: [{ label: "鑽石級", value: 10.0 }, { label: "黃金級", value: 8.0 }, { label: "銀級", value: 6.0 }, { label: "銅級", value: 4.0 }, { label: "無", value: 0.0 }]
  },
  smart_building: {
    title: "#11 智慧建築設計", type: "radio",
    options: [{ label: "鑽石級", value: 10.0 }, { label: "黃金級", value: 8.0 }, { label: "銀級", value: 6.0 }, { label: "銅級", value: 4.0 }, { label: "無", value: 0.0 }]
  },
  barrier_free: {
    title: "#12 無障礙環境", type: "radio",
    options: [{ label: "標章", value: 5.0 }, { label: "一級", value: 4.0 }, { label: "二級", value: 3.0 }, { label: "無", value: 0.0 }]
  },
  seismic_design: {
    title: "#13 耐震設計", type: "radio",
    options: [{ label: "標章", value: 10.0 }, { label: "一級", value: 6.0 }, { label: "二級", value: 4.0 }, { label: "三級", value: 2.0 }, { label: "無", value: 0.0 }]
  },
  timeline: {
    title: "#14 時程獎勵", type: "radio",
    options: [{ label: "10% (6個月內)", value: 10.0 }, { label: "7.5% (6-12個月)", value: 7.5 }, { label: "5% (1-2年)", value: 5.0 }, { label: "無", value: 0.0 }]
  },
  scale_bonus: { title: "#15 基地規模", type: "input", unit: "%", note: "依面積/街廓公式計算" },
  agreement_100: { title: "#16 協議合建", type: "input", unit: "%", note: "全體同意協議合建實施" },
  squatter_settlement: { title: "#17 違章戶處理", type: "input", unit: "%", note: "處理舊違章建築戶" }
};

const LOCAL_BONUS_ITEMS = {
  // --- 一、都市環境之貢獻 ---
  urban_A1: { group: "一、都市環境之貢獻", title: "A-1 建築退縮與配置", type: "radio", options: [{ label: "符合5項以上 (3%)", value: 3.0 }, { label: "符合4項 (2%)", value: 2.0 }, { label: "符合3項 (1%)", value: 1.0 }, { label: "無", value: 0.0 }], note: "八米以下道路側建築退縮" },
  urban_A2: { group: "一、都市環境之貢獻", title: "A-2 建築斜對角距離", type: "radio", options: [{ label: "符合合格要件 (0%)", value: 0.0 }, { label: "未符合", value: 0.0 }], note: "避免連續牆面 (無額外獎勵)" },
  urban_B1: { group: "一、都市環境之貢獻", title: "B-1 雨水流出抑制", type: "radio", options: [{ label: "符合 (1%)", value: 1.0 }, { label: "無", value: 0.0 }], note: "貯留量 ≥ 法定2倍" },
  urban_C1: { group: "一、都市環境之貢獻", title: "C-1 無遮簷人行道", type: "input", unit: "%", note: "依留設面積 ÷ 基準容積換算" },
  urban_C2: { group: "一、都市環境之貢獻", title: "C-2 騎樓留設", type: "input", unit: "%", note: "依 (面積×1.8) ÷ 基準容積換算" },
  urban_D1: { group: "一、都市環境之貢獻", title: "D-1 通案設計原則", type: "radio", options: [{ label: "全數符合 (3%)", value: 3.0 }, { label: "未全數符合", value: 0.0 }], note: "人車動線、停車、植栽等" },
  urban_E: { group: "一、都市環境之貢獻", title: "E. 綠化與立面 (綠覆率)", type: "radio", options: [{ label: "E-3: ≥ 2.0倍 (4%)", value: 4.0 }, { label: "E-2: ≥ 1.8倍 (3%)", value: 3.0 }, { label: "E-1: ≥ 1.6倍 (2%)", value: 2.0 }, { label: "無", value: 0.0 }], note: "屋頂+立面綠化" },
  urban_F1: { group: "一、都市環境之貢獻", title: "F-1 整修鄰棟騎樓", type: "input", unit: "%", note: "自行維護 (每棟0.25%)" },
  // --- 二、新技術之應用 ---
  tech_N1: { group: "二、新技術之應用", title: "N-1 電動車充電車位", type: "radio", options: [{ label: "符合 (1%)", value: 1.0 }, { label: "無", value: 0.0 }], note: "充電位 ≥ 法定車位3%" },
  // --- 三、都市更新事業實施 ---
  renew_U1: { group: "三、都市更新事業實施", title: "U-1 捐助都更基金", type: "input", unit: "%", note: "依實際捐助金額換算" },
  renew_U2_3: { group: "三、都市更新事業實施", title: "U-2/U-3 老舊建築誘因", type: "radio", options: [{ label: "U-3: 5層樓以上 (4%)", value: 4.0 }, { label: "U-2: 4層樓 (2%)", value: 2.0 }, { label: "無", value: 0.0 }], note: "屋齡≥30年、無電梯等" },
  // --- 四、特殊情形 ---
  special_resettlement: { group: "四、特殊情形", title: "整建住宅更新單元", type: "radio", options: [{ label: "符合 (直接 20%)", value: 20.0 }, { label: "無", value: 0.0 }], note: "經核定之整宅，可直接依獎勵上限辦理" }
};

const DISASTER_BONUS_CRITERIA = [
  { key: 'area_check', label: "基地規模", desc: "基地面積達 1000㎡ 以上" },
  { key: 'condition_1', label: "1. 結構安全", desc: "取得耐震標章 或 結構安全性能評估達標" },
  { key: 'condition_2', label: "2. 耐候減碳", desc: "智慧建築 + 綠建築 + 能效標示 1plus" },
  { key: 'condition_3', label: "3. 都市減災", desc: "透水性鋪面 + 雨水流出抑制設施" },
  { key: 'condition_4', label: "4. 環境友善", desc: "無障礙環境設計" }
];

const TOD_CAPS = {
  '1_core': 30.0, '1_general': 15.0,
  '2_core': 20.0, '2_general': 10.0
};

// --- Main Component ---

function App() {
  // Global & Project State
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renameProjectName, setRenameProjectName] = useState('')

  // Parcel Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParcelId, setEditingParcelId] = useState(null)
  const [newParcel, setNewParcel] = useState({
    district: '萬華區',
    section_name: '',
    lot_number: '',
    area_m2: '',
    zoning_type: '',
    announced_value: '',
    legal_coverage_rate: '45',
    legal_floor_area_rate: '225',
    road_width: ''
  })

  // Bonus Calculation Data (Persisted in Project)
  const [bonusData, setBonusData] = useState({
    bonus_central: 30.0, bonus_local: 20.0, bonus_other: 0.0, bonus_chloride: 0.0,
    bonus_tod_reward: 0.0, bonus_tod_increment: 0.0,
    bonus_soil_mgmt: 0.0, bonus_tod: 0.0, bonus_public_exemption: 7.98, bonus_cap: 100.0
  })

  // Detailed Bonus Modals State
  const [isCentralBonusModalOpen, setIsCentralBonusModalOpen] = useState(false)
  const [centralBonusDetails, setCentralBonusDetails] = useState({
    bonus_high_density: 0.0, structure_safety: 0.0, donation_public: 0.0, assist_public_road: 0.0, historic_preservation: 0.0,
    green_building: 0.0, smart_building: 0.0, barrier_free: 0.0, seismic_design: 0.0, timeline: 0.0,
    scale_bonus: 0.0, agreement_100: 0.0, squatter_settlement: 0.0
  })

  const [isLocalBonusModalOpen, setIsLocalBonusModalOpen] = useState(false)
  const [localBonusDetails, setLocalBonusDetails] = useState({
    urban_A1: 0.0, urban_A2: 0.0, urban_B1: 0.0, urban_C1: 0.0, urban_C2: 0.0, urban_D1: 0.0, urban_E: 0.0, urban_F1: 0.0,
    tech_N1: 0.0, renew_U1: 0.0, renew_U2_3: 0.0, special_resettlement: 0.0
  })

  const [isDisasterBonusModalOpen, setIsDisasterBonusModalOpen] = useState(false)
  const [disasterBonusChecks, setDisasterBonusChecks] = useState({
    area_check: false, condition_1: false, condition_2: false, condition_3: false, condition_4: false
  })

  const [isChlorideModalOpen, setIsChlorideModalOpen] = useState(false)
  const [chlorideInputs, setChlorideInputs] = useState({
    method: 'original_far', A: 0, B: 0
  })

  const [isTODModalOpen, setIsTODModalOpen] = useState(false)
  const [todInputs, setTodInputs] = useState({
    station_grade: '1_core', is_large_site: false, road_width_check: false,
    d1_metro_facilities: 0, d2_bike_parking: 0, d3_pedestrian: 0, d4_public_facility: 0, d5_payment: 0,
    increment_base: 0, increment_bonus: 0
  })

  // Soil Mgmt 80-2 Modal State
  const [isSoilMgmtModalOpen, setIsSoilMgmtModalOpen] = useState(false)
  const [soilMgmtInputs, setSoilMgmtInputs] = useState({
    desired_bonus: 0.0,
    unit_sales_price: 0, // 銷售單價 (萬元/坪)
    unit_cost_construct: 0, // 營建成本 (萬元/坪)
    unit_cost_mgmt: 0, // 管銷費用 (萬元/坪 or %) - assuming Amount for now based on formula text, but usually % of sales. Let's stick to unit amount as per prompt structure
    mgmt_rate: 0 // If user wants to input %, but prompt implies direct subtraction value. Let's provide "Cost per ping".
  })

  // --- Effects ---

  useEffect(() => { fetchProjects() }, [])

  useEffect(() => {
    if (selectedProject) {
      setBonusData({
        bonus_central: selectedProject.bonus_central ?? 30.0,
        bonus_local: selectedProject.bonus_local ?? 20.0,
        bonus_other: selectedProject.bonus_other ?? 0.0,
        bonus_chloride: selectedProject.bonus_chloride ?? 0.0,
        bonus_tod_reward: selectedProject.bonus_tod_reward ?? 0.0,
        bonus_tod_increment: selectedProject.bonus_tod_increment ?? 0.0,
        bonus_soil_mgmt: selectedProject.bonus_soil_mgmt ?? 0.0,
        bonus_tod: selectedProject.bonus_tod ?? 0.0,
        bonus_public_exemption: selectedProject.bonus_public_exemption ?? 7.98,
        bonus_cap: selectedProject.bonus_cap ?? 100.0
      })
    }
  }, [selectedProject])

  // --- API Handlers ---

  const fetchProjects = async () => { try { const res = await axios.get(`${API_URL}/projects/`); setProjects(res.data) } catch (e) { console.error(e) } }

  const fetchProjectDetails = async (id) => { try { const res = await axios.get(`${API_URL}/projects/${id}`); setSelectedProject(res.data) } catch (e) { console.error(e) } }

  const handleProjectClick = (p) => fetchProjectDetails(p.id)

  const handleCreateProject = async (e) => {
    e.preventDefault();
    await axios.post(`${API_URL}/projects/`, { name: newProjectName });
    setIsProjectModalOpen(false); setNewProjectName(''); fetchProjects()
  }

  const handleRenameProject = async (e) => {
    e.preventDefault(); if (!selectedProject) return;
    await axios.put(`${API_URL}/projects/${selectedProject.id}`, { name: renameProjectName });
    setSelectedProject({ ...selectedProject, name: renameProjectName });
    setProjects(projects.map(p => p.id === selectedProject.id ? { ...p, name: renameProjectName } : p));
    setIsRenameModalOpen(false)
  }

  // --- Parcel Logic ---

  const handleInputChange = (e) => setNewParcel({ ...newParcel, [e.target.name]: e.target.value })

  const handleZoneChange = (e) => {
    const zone = e.target.value;
    const updates = { zoning_type: zone }
    if (ZONING_RATES[zone]) {
      updates.legal_coverage_rate = ZONING_RATES[zone].coverage;
      updates.legal_floor_area_rate = ZONING_RATES[zone].floor_area
    }
    setNewParcel({ ...newParcel, ...updates })
  }

  const handleAutoFetch = async () => {
    if (!newParcel.section_name || !newParcel.lot_number) return alert('請先輸入段名和地號')
    try {
      const res = await axios.get(`${API_URL}/proxy/land-info`, { params: { district: newParcel.district, lot_no: newParcel.lot_number, section_name: newParcel.section_name } })
      setNewParcel({ ...newParcel, area_m2: res.data.area, announced_value: res.data.price })
    } catch { alert('查詢失敗') }
  }

  const handleParcelSubmit = async (e) => {
    e.preventDefault(); if (!selectedProject) return
    try {
      const payload = { ...newParcel, area_m2: parseFloat(newParcel.area_m2), announced_value: parseFloat(newParcel.announced_value) }
      if (editingParcelId) await axios.put(`${API_URL}/land_parcels/${editingParcelId}`, payload)
      else await axios.post(`${API_URL}/projects/${selectedProject.id}/parcels/`, payload)

      setIsModalOpen(false); setEditingParcelId(null);
      setNewParcel({ district: '萬華區', section_name: '', lot_number: '', area_m2: '', zoning_type: '', announced_value: '', legal_coverage_rate: '45', legal_floor_area_rate: '225', road_width: '' });
      fetchProjectDetails(selectedProject.id)
    } catch (e) { console.error(e) }
  }

  const handleEditParcel = (p) => {
    setEditingParcelId(p.id);
    setNewParcel({ ...p, area_m2: p.area_m2, announced_value: p.announced_value });
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingParcelId(null);
    setNewParcel({ district: '萬華區', section_name: '', lot_number: '', area_m2: '', zoning_type: '', announced_value: '', legal_coverage_rate: '45', legal_floor_area_rate: '225', road_width: '' });
    setIsModalOpen(true)
  }

  // --- Calculation Logic ---

  const calculateLegalCapacity = () => selectedProject ? selectedProject.land_parcels.reduce((sum, p) => sum + (p.area_m2 * (p.legal_floor_area_rate / 100)), 0) : 0

  const handleBonusChange = (e) => setBonusData({ ...bonusData, [e.target.name]: parseFloat(e.target.value) || 0 })

  const handleBonusUpdate = async () => { if (selectedProject) await axios.put(`${API_URL}/projects/${selectedProject.id}`, bonusData) }

  // Central Bonus
  const handleCentralDetailChange = (k, v) => setCentralBonusDetails({ ...centralBonusDetails, [k]: parseFloat(v) || 0 })
  const calculateCentralTotal = () => Object.values(centralBonusDetails).reduce((s, v) => s + v, 0).toFixed(2)
  const applyCentralBonus = () => {
    const final = Math.min(calculateCentralTotal(), 30.0);
    setBonusData({ ...bonusData, bonus_central: final });
    if (selectedProject) axios.put(`${API_URL}/projects/${selectedProject.id}`, { ...selectedProject, bonus_central: final }).then(res => fetchDataAndSync(res.data))
    setIsCentralBonusModalOpen(false)
  }

  // Local Bonus
  const handleLocalDetailChange = (k, v) => setLocalBonusDetails({ ...localBonusDetails, [k]: parseFloat(v) || 0 })
  const calculateLocalTotal = () => Object.values(localBonusDetails).reduce((s, v) => s + v, 0).toFixed(2)
  const applyLocalBonus = () => {
    const final = Math.min(calculateLocalTotal(), 20.0);
    setBonusData({ ...bonusData, bonus_local: final });
    if (selectedProject) axios.put(`${API_URL}/projects/${selectedProject.id}`, { ...selectedProject, bonus_local: final }).then(res => fetchDataAndSync(res.data))
    setIsLocalBonusModalOpen(false)
  }

  // Disaster Bonus
  const handleDisasterCheckChange = (k, c) => setDisasterBonusChecks({ ...disasterBonusChecks, [k]: c })
  const calculateDisasterTotal = () => Object.values(disasterBonusChecks).every(v => v) ? 30.0 : 0.0
  const applyDisasterBonus = () => {
    const final = calculateDisasterTotal();
    setBonusData({ ...bonusData, bonus_other: final });
    if (selectedProject) axios.put(`${API_URL}/projects/${selectedProject.id}`, { ...selectedProject, bonus_other: final }).then(res => fetchDataAndSync(res.data))
    setIsDisasterBonusModalOpen(false)
  }

  // Chloride Bonus
  const handleChlorideInputChange = (k, v) => setChlorideInputs(p => ({ ...p, [k]: k === 'method' ? v : parseFloat(v) || 0 }))
  const calculateChlorideRewardArea = () => (chlorideInputs.A + chlorideInputs.B) * 0.3
  const applyChlorideBonus = () => {
    const base = calculateLegalCapacity(); if (base <= 0) return alert('請先輸入基地資訊')
    const final = parseFloat(((calculateChlorideRewardArea() / base) * 100).toFixed(2))
    setBonusData({ ...bonusData, bonus_chloride: final });
    if (selectedProject) axios.put(`${API_URL}/projects/${selectedProject.id}`, { ...selectedProject, bonus_chloride: final }).then(res => fetchDataAndSync(res.data))
    setIsChlorideModalOpen(false)
  }

  // TOD Bonus
  const handleTODInputChange = (k, v) => setTodInputs(p => ({ ...p, [k]: (['station_grade', 'is_large_site', 'road_width_check'].includes(k)) ? v : parseFloat(v) || 0 }))
  const calculateTODTotalReward = () => todInputs.d1_metro_facilities + todInputs.d2_bike_parking + todInputs.d3_pedestrian + todInputs.d4_public_facility + todInputs.d5_payment
  const calculateTODIncrementTotal = () => todInputs.increment_base + todInputs.increment_bonus
  const applyTODBonus = () => {
    const reward = Math.min(calculateTODTotalReward(), TOD_CAPS[todInputs.station_grade] || 30.0)
    const increment = calculateTODIncrementTotal()
    setBonusData({ ...bonusData, bonus_tod_reward: reward, bonus_tod_increment: increment })
    if (selectedProject) axios.put(`${API_URL}/projects/${selectedProject.id}`, { ...selectedProject, bonus_tod_reward: reward, bonus_tod_increment: increment }).then(res => fetchDataAndSync(res.data))
    setIsTODModalOpen(false)
  }

  // Soil Mgmt 80-2 Logic
  const calculateTotalSiteArea = () => selectedProject ? selectedProject.land_parcels.reduce((sum, p) => sum + p.area_m2, 0) : 0
  const isSoilMgmtEligible = () => calculateTotalSiteArea() >= 2000

  const handleSoilMgmtInputChange = (k, v) => setSoilMgmtInputs(p => ({ ...p, [k]: parseFloat(v) || 0 }))

  // Requirement: (Sales - Const - Mgmt) * Bonus Area * 50%
  // Bonus Area = Base Volume * (Desired Bonus / 100)
  // Converting Area m2 to Ping: Area * 0.3025
  const calculateResultingBonusAreaPing = () => {
    const bonusAreaM2 = baseVolume * (soilMgmtInputs.desired_bonus / 100)
    return bonusAreaM2 * 0.3025
  }

  const calculateSoilMgmtNetProfit = () => {
    const profitPerPing = soilMgmtInputs.unit_sales_price - soilMgmtInputs.unit_cost_construct - soilMgmtInputs.unit_cost_mgmt
    return profitPerPing * calculateResultingBonusAreaPing()
  }

  const applySoilMgmtBonus = () => {
    // If not eligible, maybe warn? But usually allow override.
    setBonusData({ ...bonusData, bonus_soil_mgmt: soilMgmtInputs.desired_bonus })
    if (selectedProject) axios.put(`${API_URL}/projects/${selectedProject.id}`, { ...selectedProject, bonus_soil_mgmt: soilMgmtInputs.desired_bonus }).then(res => fetchDataAndSync(res.data))
    setIsSoilMgmtModalOpen(false)
  }

  const fetchDataAndSync = (data) => {
    setSelectedProject(data);
    setProjects(projects.map(p => p.id === data.id ? data : p))
  }

  // Totals
  const baseVolume = calculateLegalCapacity()
  const applicationTotal = bonusData.bonus_central + bonusData.bonus_local + bonusData.bonus_other + bonusData.bonus_chloride + bonusData.bonus_tod_reward + bonusData.bonus_soil_mgmt
  const actualBonus = Math.min(applicationTotal, bonusData.bonus_cap)
  const totalAllowedRate = 100 + actualBonus + bonusData.bonus_public_exemption + bonusData.bonus_tod_increment

  // --- UI Sub-components ---

  const RenderBonusRow = ({ label, name, value, note, isInput = true, isPink = false, icon = null, onIconClick = null }) => (
    <tr className={isPink ? "bg-red-50" : ""}>
      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 border-r">
        <div className="flex items-center">{label} {icon && <button onClick={onIconClick} className="ml-2 text-blue-500 bg-blue-50 p-1 rounded-full"><List size={16} /></button>}</div>
      </td>
      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 border-r w-40">
        {isInput ? <div className="flex items-center"><input type="number" name={name} value={value} onChange={handleBonusChange} onBlur={handleBonusUpdate} className="w-full bg-yellow-50 border-gray-300 rounded px-2 py-1 text-right" /><span className="ml-2">%</span></div> : <div className="text-right px-2">{value}%</div>}
      </td>
      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 border-r text-right">{(baseVolume * value / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</td>
      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{note}</td>
    </tr>
  )

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-800 bg-gray-900">
          <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1 rounded">Arch</span>Cost
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Estimation Platform</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex justify-between items-center text-gray-400 text-xs uppercase tracking-wider mb-2 font-bold">
            <span>Projects</span>
            <button onClick={() => setIsProjectModalOpen(true)} className="hover:text-white transition-colors"><Plus size={16} /></button>
          </div>
          {projects.map(project => (
            <div key={project.id} onClick={() => handleProjectClick(project)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedProject?.id === project.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-800 text-gray-300'}`}>
              <div className="truncate font-medium">{project.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <header className="h-16 bg-white shadow-sm border-b flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">{selectedProject ? selectedProject.name : 'Select a Project'}</h2>
            {selectedProject && <button onClick={() => { setIsRenameModalOpen(true); setRenameProjectName(selectedProject.name) }} className="text-gray-400 hover:text-gray-600"><Edit size={16} /></button>}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {selectedProject ? (
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Land Parcels Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><span className="w-2 h-6 bg-blue-500 rounded-full"></span>土地資料 Land Parcels</h3>
                  <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium"><Plus size={16} /> 新增地號</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <tr><th className="px-6 py-4 font-bold">行政區</th><th className="px-6 py-4 font-bold">段名</th><th className="px-6 py-4 font-bold">地號</th><th className="px-6 py-4 font-bold text-right">面積 (m²)</th><th className="px-6 py-4 font-bold">分區</th><th className="px-6 py-4 font-bold text-right">建蔽率 (%)</th><th className="px-6 py-4 font-bold text-right">容積率 (%)</th><th className="px-6 py-4 font-bold text-right">允建容積 (m²)</th><th className="px-6 py-4 font-bold text-center">操作</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedProject.land_parcels.map((parcel) => (
                        <tr key={parcel.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{parcel.district}</td><td className="px-6 py-4 text-gray-600">{parcel.section_name}</td><td className="px-6 py-4 text-gray-600 font-mono">{parcel.lot_number}</td><td className="px-6 py-4 text-gray-900 font-mono text-right">{parcel.area_m2.toLocaleString()}</td><td className="px-6 py-4 text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">{parcel.zoning_type}</span></td><td className="px-6 py-4 text-gray-600 font-mono text-right">{parcel.legal_coverage_rate}</td><td className="px-6 py-4 text-gray-600 font-mono text-right">{parcel.legal_floor_area_rate}</td><td className="px-6 py-4 text-gray-600 font-mono text-right">{(parcel.area_m2 * parcel.legal_floor_area_rate / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                          <td className="px-6 py-4 text-center"><button onClick={() => handleEditParcel(parcel)} className="text-gray-400 hover:text-blue-600 transition-colors mx-1"><Edit size={16} /></button></td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-100">
                        <td colSpan="3" className="px-6 py-4 text-right text-gray-700">總計 Total</td><td className="px-6 py-4 text-right text-blue-700">{selectedProject.land_parcels.reduce((sum, p) => sum + p.area_m2, 0).toLocaleString()}</td><td colSpan="3"></td><td className="px-6 py-4 text-right text-blue-700">{selectedProject.land_parcels.reduce((sum, p) => sum + (p.area_m2 * p.legal_floor_area_rate / 100), 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td><td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bonus Calculation Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 h-16 flex items-center"><h3 className="font-bold text-gray-700 flex items-center gap-2"><span className="w-2 h-6 bg-yellow-500 rounded-full"></span>🏆 容積獎勵計算</h3></div>
                <div className="p-6">
                  <table className="w-full">
                    <thead><tr className="border-b-2 border-gray-200 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"><th className="pb-3 pl-6">項目</th><th className="pb-3 w-40">比值 %</th><th className="pb-3 text-right">面積 (m²)</th><th className="pb-3">備註</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      <RenderBonusRow label="中央都更獎勵" name="bonus_central" value={bonusData.bonus_central} icon={List} onIconClick={() => setIsCentralBonusModalOpen(true)} />
                      <RenderBonusRow label="地方都更獎勵" name="bonus_local" value={bonusData.bonus_local} icon={List} onIconClick={() => setIsLocalBonusModalOpen(true)} />
                      <RenderBonusRow label="防災型都更獎勵" name="bonus_other" value={bonusData.bonus_other} icon={List} onIconClick={() => setIsDisasterBonusModalOpen(true)} />
                      <RenderBonusRow label="高氯離子建物獎勵 (海砂屋)" name="bonus_chloride" value={bonusData.bonus_chloride} icon={Calculator} onIconClick={() => setIsChlorideModalOpen(true)} note="依原建物 30% 換算" />
                      <RenderBonusRow label="TOD 容積獎勵" name="bonus_tod_reward" value={bonusData.bonus_tod_reward} icon={Calculator} onIconClick={() => setIsTODModalOpen(true)} note="分級上限" />

                      <RenderBonusRow label="土管80-2" name="bonus_soil_mgmt" value={bonusData.bonus_soil_mgmt} icon={Calculator} onIconClick={() => setIsSoilMgmtModalOpen(true)} note="需回饋 50% 淨利" />
                      <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                        <td className="px-6 py-4 text-gray-900">總申請獎勵額度 (不含增額)</td><td className="px-6 py-4 text-blue-700 font-bold">{applicationTotal.toFixed(2)}%</td><td className="px-6 py-4 text-right">{(baseVolume * applicationTotal / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</td><td></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-900">法定上限</td><td className="px-6 py-4 text-red-600 font-bold">{bonusData.bonus_cap.toFixed(2)}%</td><td colSpan="2"></td>
                      </tr>
                      <tr className="bg-yellow-50 font-bold border-t border-yellow-200">
                        <td className="px-6 py-4 text-gray-900">實際核准獎勵 (取小值)</td><td className="px-6 py-4 text-green-700 font-bold">{actualBonus.toFixed(2)}%</td><td className="px-6 py-4 text-right text-green-700">{(baseVolume * actualBonus / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</td><td></td>
                      </tr>
                      <RenderBonusRow label="公益免計" name="bonus_public_exemption" value={bonusData.bonus_public_exemption} note="max 15%" />
                      <tr className="bg-blue-50 border-t-4 border-blue-200">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">總計: 允建總容積</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-700 text-right">
                          <div>{totalAllowedRate.toFixed(2)}%</div>
                          {totalAllowedRate > 200 && <span className="text-red-600 text-xs flex items-center gap-1"><AlertTriangle size={12} /> 超過2倍上限</span>}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-700 text-right">{(baseVolume * totalAllowedRate / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</td>
                        <td className="px-6 py-4 text-sm text-gray-500">基準容積 * (1 + 實設 + 公益) + 增額</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center"><Search size={32} /></div>
              <p>Select a project from the sidebar to view details</p>
            </div>
          )}
        </main>
      </div>

      {/* --- MODALS --- */}

      {/* Project & Parcel Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <form onSubmit={handleParcelSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-lg">{editingParcelId ? 'Edit Parcel' : 'Add New Parcel'}</h3><button type="button" onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">行政區</label>
                  <select name="district" value={newParcel.district} onChange={handleInputChange} className="w-full border rounded p-2">
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">分區</label>
                  <select name="zoning_type" value={newParcel.zoning_type} onChange={handleZoneChange} className="w-full border rounded p-2">
                    <option value="">選擇分區</option>
                    {TAIPEI_ZONING_OPTIONS.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">段名</label><input type="text" name="section_name" value={newParcel.section_name} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700">地號</label><input type="text" name="lot_number" value={newParcel.lot_number} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
              </div>
              <div><button type="button" onClick={handleAutoFetch} className="text-blue-600 text-sm hover:underline">Auto Fetch Info</button></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">面積 (m²)</label><input type="number" name="area_m2" value={newParcel.area_m2} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700">公告現值</label><input type="number" name="announced_value" value={newParcel.announced_value} onChange={handleInputChange} className="w-full border rounded p-2" /></div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">Save</button></div>
          </form>
        </div>
      )}

      {isProjectModalOpen && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><form onSubmit={handleCreateProject} className="bg-white p-6 rounded-lg w-96"><h3 className="font-bold mb-4">New Project</h3><input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project Name" className="w-full border p-2 mb-4" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button></div></form></div>)}
      {isRenameModalOpen && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><form onSubmit={handleRenameProject} className="bg-white p-6 rounded-lg w-96"><h3 className="font-bold mb-4">Rename Project</h3><input value={renameProjectName} onChange={e => setRenameProjectName(e.target.value)} className="w-full border p-2 mb-4" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsRenameModalOpen(false)}>Cancel</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button></div></form></div>)}

      {/* Central Bonus Modal */}
      {isCentralBonusModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2">📄 中央都市更新獎勵明細</h2><button onClick={() => setIsCentralBonusModalOpen(false)}><X size={24} /></button></div>
            <div className="p-6 overflow-y-auto space-y-4">
              {Object.entries(CENTRAL_BONUS_ITEMS).map(([key, item]) => (
                <div key={key} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.note} {item.unit && `(${item.unit})`}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.type === 'radio' ? (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {item.options.map(opt => (
                          <label key={opt.label} className={`cursor-pointer px-3 py-1 rounded border text-sm transition-colors ${centralBonusDetails[key] === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                            <input type="radio" name={key} value={opt.value} checked={centralBonusDetails[key] === opt.value} onChange={() => handleCentralDetailChange(key, opt.value)} className="hidden" />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="w-32"><input type="number" value={centralBonusDetails[key]} onChange={(e) => handleCentralDetailChange(key, e.target.value)} className="w-full border rounded px-2 py-1 text-right" placeholder="0" /></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-gray-600">總計: {calculateCentralTotal()}% {parseFloat(calculateCentralTotal()) > 30 && <span className="text-red-500 font-bold ml-2">(已達上限 30%)</span>}</div>
              <div className="flex gap-3"><button onClick={() => setIsCentralBonusModalOpen(false)} className="px-4 py-2 text-gray-700">取消</button><button onClick={applyCentralBonus} className="px-6 py-2 bg-blue-600 text-white rounded-lg">確認並帶入</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Local Bonus Modal */}
      {isLocalBonusModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2">🏙️ 台北市地方都更獎勵 (Delta B)</h2><button onClick={() => setIsLocalBonusModalOpen(false)}><X size={24} /></button></div>
            <div className="p-6 overflow-y-auto space-y-6">
              {['一、都市環境之貢獻', '二、新技術之應用', '三、都市更新事業實施', '四、特殊情形'].map(group => (
                <div key={group} className="space-y-3">
                  <h3 className="font-bold text-gray-700 border-b pb-1">{group}</h3>
                  {Object.entries(LOCAL_BONUS_ITEMS).filter(([_, item]) => item.group === group).map(([key, item]) => (
                    <div key={key} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
                      <div className="flex-1"><div className="font-bold text-gray-800">{item.title}</div><div className="text-xs text-gray-500">{item.note}</div></div>
                      <div className="flex items-center gap-2">
                        {item.type === 'radio' ? (
                          <div className="flex flex-wrap gap-2 justify-end">{item.options.map(opt => (<label key={opt.label} className={`cursor-pointer px-2 py-1 rounded border text-xs ${localBonusDetails[key] === opt.value ? 'bg-green-600 text-white' : 'bg-white'}`}><input type="radio" name={key} checked={localBonusDetails[key] === opt.value} onChange={() => handleLocalDetailChange(key, opt.value)} className="hidden" />{opt.label}</label>))}</div>
                        ) : (<div className="w-24"><input type="number" value={localBonusDetails[key]} onChange={(e) => handleLocalDetailChange(key, e.target.value)} className="w-full border rounded px-2 py-1 text-right" /></div>)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-gray-600">總計: {calculateLocalTotal()}% {parseFloat(calculateLocalTotal()) > 20 && <span className="text-red-500 font-bold ml-2">(已達上限 20%)</span>}</div>
              <div className="flex gap-3"><button onClick={() => setIsLocalBonusModalOpen(false)} className="px-4 py-2 text-gray-700">取消</button><button onClick={applyLocalBonus} className="px-6 py-2 bg-green-600 text-white rounded-lg">確認並帶入</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Disaster Bonus Modal */}
      {isDisasterBonusModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-bold text-red-700 flex items-center gap-2">🔥 防災型都更獎勵檢核表</h2><button onClick={() => setIsDisasterBonusModalOpen(false)}><X size={24} /></button></div>
            <div className="p-6 space-y-4">
              {DISASTER_BONUS_CRITERIA.map(c => (
                <label key={c.key} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${disasterBonusChecks[c.key] ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`}>{disasterBonusChecks[c.key] && <CheckCircle size={14} />}</div>
                  <input type="checkbox" className="hidden" checked={disasterBonusChecks[c.key]} onChange={(e) => handleDisasterCheckChange(c.key, e.target.checked)} />
                  <div><div className="font-bold text-gray-800">{c.label}</div><div className="text-xs text-gray-500">{c.desc}</div></div>
                </label>
              ))}
              <div className="mt-4 p-4 bg-red-50 rounded-lg text-center border border-red-100">
                <div className="text-gray-600 text-sm mb-1">符合條件狀態</div>
                <div className={`text-2xl font-bold ${calculateDisasterTotal() > 0 ? 'text-red-600' : 'text-gray-400'}`}>{calculateDisasterTotal() > 0 ? "符合獎勵資格 (30%)" : "未符合 (0%)"}</div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setIsDisasterBonusModalOpen(false)} className="px-4 py-2 text-gray-700">取消</button><button onClick={applyDisasterBonus} className="px-6 py-2 bg-red-600 text-white rounded-lg">確認並帶入</button></div>
          </div>
        </div>
      )}

      {/* Chloride Bonus Modal */}
      {isChlorideModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">🧪 高氯離子建物獎勵試算 (海砂屋)</h2><button onClick={() => setIsChlorideModalOpen(false)}><X size={24} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-2">計算方式</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="chlorideMethod" checked={chlorideInputs.method === 'original_far'} onChange={() => handleChlorideInputChange('method', 'original_far')} />依原容積率計算 (A1 + B1)</label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="chlorideMethod" checked={chlorideInputs.method === 'original_total'} onChange={() => handleChlorideInputChange('method', 'original_total')} />依原總樓地板計算 (A2 + B2)</label></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-600 mb-1">{chlorideInputs.method === 'original_far' ? "A1 地面以上 (申請)" : "A2 地面以上 (不含獎勵)"}</label><input type="number" min="0" value={chlorideInputs.A} onChange={(e) => handleChlorideInputChange('A', e.target.value)} className="w-full border p-2 rounded" /></div><div><label className="block text-sm text-gray-600 mb-1">{chlorideInputs.method === 'original_far' ? "B1 地下層 (申請)" : "B2 地下層 (不含防空)"}</label><input type="number" min="0" value={chlorideInputs.B} onChange={(e) => handleChlorideInputChange('B', e.target.value)} className="w-full border p-2 rounded" /></div></div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><div className="flex justify-between mb-2"><span className="text-gray-600 text-sm">原建築計算基準面積 (Sum)</span><span className="font-bold">{(chlorideInputs.A + chlorideInputs.B).toFixed(2)} m²</span></div><div className="flex justify-between mb-2"><span className="text-blue-700 font-bold">可爭取獎勵面積 (30%)</span><span className="font-bold text-blue-700 text-lg">{calculateChlorideRewardArea().toFixed(2)} m²</span></div><div className="border-t border-blue-200 pt-2 flex justify-between items-center"><span className="text-gray-600 text-sm">相當於法定容積百分比</span><span className="font-bold text-red-600 text-xl">{calculateLegalCapacity() > 0 ? ((calculateChlorideRewardArea() / calculateLegalCapacity()) * 100).toFixed(2) : '0.00'} %</span></div></div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setIsChlorideModalOpen(false)} className="px-4 py-2 text-gray-700">取消</button><button onClick={applyChlorideBonus} className="px-6 py-2 bg-blue-600 text-white rounded-lg">帶入結果</button></div>
          </div>
        </div>
      )}

      {/* TOD Bonus Modal */}
      {isTODModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="bg-purple-100 p-2 rounded-lg">🚇</span>台北市 TOD 專案評估 (獎勵+增額)</h2><button onClick={() => setIsTODModalOpen(false)}><X size={24} /></button></div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-3"><h3 className="font-bold text-purple-900">1. 基地條件與上限設定</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">場站等級與區位</label><select className="w-full border-gray-300 rounded-lg px-3 py-2" value={todInputs.station_grade} onChange={(e) => handleTODInputChange('station_grade', e.target.value)}><option value="1_core">一級場站 - 核心區 (Cap 30%)</option><option value="1_general">一級場站 - 一般區 (Cap 15%)</option><option value="2_core">二級場站 - 核心區 (Cap 20%)</option><option value="2_general">二級場站 - 一般區 (Cap 10%)</option></select></div><div className="flex items-center gap-2 mt-6"><input type="checkbox" checked={todInputs.road_width_check} onChange={(e) => handleTODInputChange('road_width_check', e.target.checked)} className="w-5 h-5 text-purple-600" /><span className="font-bold text-gray-700">臨路寬度 ≥ 8m (必要條件)</span></div></div></div>
              <div className="space-y-4"><h3 className="font-bold text-gray-800 border-b pb-2">2. TOD 容積獎勵項目 (Rewards)</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-600">D1 捷運設施 (%)</label><input type="number" value={todInputs.d1_metro_facilities} onChange={(e) => handleTODInputChange('d1_metro_facilities', e.target.value)} className="w-full border p-2 rounded" /></div><div><label className="block text-sm text-gray-600">D2 自行車 (%)</label><input type="number" value={todInputs.d2_bike_parking} onChange={(e) => handleTODInputChange('d2_bike_parking', e.target.value)} className="w-full border p-2 rounded" /></div><div><label className="block text-sm text-gray-600">D4 公益設施 (%)</label><input type="number" value={todInputs.d4_public_facility} onChange={(e) => handleTODInputChange('d4_public_facility', e.target.value)} className="w-full border p-2 rounded" /></div><div><label className="block text-sm text-gray-600">D5 代金 (%)</label><input type="number" value={todInputs.d5_payment} onChange={(e) => handleTODInputChange('d5_payment', e.target.value)} className="w-full border p-2 rounded" /></div></div><div className="bg-gray-50 p-3 rounded"><label className="block text-sm font-bold text-gray-700 mb-2">D3 友善人行空間</label><div className="flex flex-wrap gap-4">{[0, 1, 2, 3, 4, 6].map(val => (<label key={val} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="d3_pedestrian" value={val} checked={todInputs.d3_pedestrian === val} onChange={() => handleTODInputChange('d3_pedestrian', val)} /><span>{val}%</span></label>))}</div><p className="text-xs text-gray-500 mt-1">標準級: 1~3% / 進階級: 2~6%</p></div><div className="text-right"><span className="text-gray-600 mr-2">試算總和: {calculateTODTotalReward()}%</span><span className="font-bold text-purple-700">有效獎勵 (Cap): {Math.min(calculateTODTotalReward(), TOD_CAPS[todInputs.station_grade]).toFixed(2)}%</span></div></div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"><h3 className="font-bold text-yellow-900 mb-2">3. TOD 增額容積 (Increment)</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-gray-600">增額申請 (%)</label><input type="number" value={todInputs.increment_base} onChange={(e) => handleTODInputChange('increment_base', e.target.value)} className="w-full border p-2 rounded" /></div><div><label className="block text-sm text-gray-600">規模/路寬加給 (%)</label><input type="number" value={todInputs.increment_bonus} onChange={(e) => handleTODInputChange('increment_bonus', e.target.value)} className="w-full border p-2 rounded" /></div></div><div className="text-right mt-2 font-bold text-yellow-800">總增額: {calculateTODIncrementTotal().toFixed(2)}%</div></div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setIsTODModalOpen(false)} className="px-4 py-2 text-gray-700">取消</button><button onClick={applyTODBonus} className="px-6 py-2 bg-purple-600 text-white rounded-lg">帶入與儲存</button></div>
          </div>
        </div>
      )}

      {/* Soil Mgmt Modal */}
      {isSoilMgmtModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="bg-orange-100 p-2 rounded-lg">🏗️</span>土管 80-2 檢核與計算</h2><button onClick={() => setIsSoilMgmtModalOpen(false)}><X size={24} /></button></div>
            <div className="p-6 space-y-6">
              <div className={`p-4 rounded-lg border flex justify-between items-center ${isSoilMgmtEligible() ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div><div className="text-sm text-gray-600">基地規模檢核 (門檻 2,000 m²)</div><div className="font-bold text-lg">{calculateTotalSiteArea().toLocaleString()} m²</div></div>
                <div className={`px-3 py-1 rounded text-sm font-bold ${isSoilMgmtEligible() ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{isSoilMgmtEligible() ? '符合資格' : '未達門檻'}</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">預計申請獎勵額度 (%)</label>
                <input type="number" value={soilMgmtInputs.desired_bonus} onChange={(e) => handleSoilMgmtInputChange('desired_bonus', e.target.value)} className="w-full border p-2 rounded text-lg" placeholder="e.g. 20" />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-700 mb-3">回饋金試算 (淨利益之 50%)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs text-gray-500">銷售營收 (萬元/坪)</label><input type="number" value={soilMgmtInputs.unit_sales_price} onChange={(e) => handleSoilMgmtInputChange('unit_sales_price', e.target.value)} className="w-full border p-2 rounded" /></div>
                  <div><label className="block text-xs text-gray-500">營建成本 (萬元/坪)</label><input type="number" value={soilMgmtInputs.unit_cost_construct} onChange={(e) => handleSoilMgmtInputChange('unit_cost_construct', e.target.value)} className="w-full border p-2 rounded" /></div>
                  <div><label className="block text-xs text-gray-500">管銷費用 (萬元/坪)</label><input type="number" value={soilMgmtInputs.unit_cost_mgmt} onChange={(e) => handleSoilMgmtInputChange('unit_cost_mgmt', e.target.value)} className="w-full border p-2 rounded" /></div>
                </div>
                <div className="bg-gray-50 p-4 rounded text-right space-y-1">
                  <div className="text-sm text-gray-600">增加容積樓地板: {calculateResultingBonusAreaPing().toFixed(2)} 坪</div>
                  <div className="text-sm text-gray-600">預估淨利益: {calculateSoilMgmtNetProfit().toLocaleString()} 萬元</div>
                  <div className="text-xl font-bold text-orange-600 border-t pt-2 mt-2">應繳回饋金: {(calculateSoilMgmtNetProfit() * 0.5).toLocaleString()} 萬元</div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setIsSoilMgmtModalOpen(false)} className="px-4 py-2 text-gray-700">取消</button><button onClick={applySoilMgmtBonus} className="px-6 py-2 bg-orange-600 text-white rounded-lg">確認並帶入</button></div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
