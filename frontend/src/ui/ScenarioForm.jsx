import React, { useState, useMemo } from 'react';
import { Plus, Edit, List } from 'lucide-react';
import useProjectStore from '../store/useProjectStore';
import LandMap from '../components/LandMap';

import { ZONING_RATES, CENTRAL_BONUS_ITEMS, LOCAL_BONUS_ITEMS, DISASTER_BONUS_ITEMS, CHLORIDE_BONUS_ITEMS, TOD_BONUS_ITEMS, TOD_INCREMENT_ITEMS, TOD_CONFIG, OWNERSHIP_STATUS_OPTIONS, INTEGRATION_RISK_OPTIONS, MIXED_ZONE_POLICY_OPTIONS, SITE_POLICY } from '../domain/constants';
import DetailModalFooter from './DetailModalFooter';
import { fetchLandInfo } from '../api/parcels';
import { normalizeTodDetails, toNum, fmtFixed } from '../domain/bonusHelpers';

// Bonus Row Component (Moved outside to fix lint)
const RenderBonusRow = ({ label, name, value, note, baseVolume, setBonusData, saveScenario, isInput = true, icon: Icon = null, onIconClick = null, calculatedArea = null, status = null, isDisabled = false }) => {
    // Determine lock visually
    const isLocked = isDisabled || status === 'locked';
    const isCompliant = status === 'pass';
    const isNonCompliant = status === 'fail';

    return (
        <tr className={isLocked ? "bg-gray-50 opacity-60" : "hover:bg-blue-50 transition-colors"}>
            <td className="px-6 py-2 border-r flex items-center gap-2 text-sm font-medium h-full">
                {isCompliant && !isLocked && <span className="text-green-600 font-bold" title="符合 (Compliant)">✔</span>}
                {isNonCompliant && !isLocked && <span className="text-red-600 font-bold" title="未符合 (Non-Compliant)">✘</span>}
                {isLocked && <span className="text-gray-400 font-bold" title="Locked">🔒</span>}

                <span className={isLocked ? "text-gray-500" : "text-gray-900"}>{label}</span>

                {Icon && !isLocked && (
                    <button
                        onClick={onIconClick}
                        className="p-1 hover:bg-blue-100 rounded text-blue-500 transition-colors ml-auto"
                        title="Edit Details"
                        type="button"
                    >
                        <Icon className="w-4 h-4" />
                    </button>
                )}
            </td>
            <td className="px-6 py-2 border-r w-40">
                {isInput ? (
                    <div className="flex items-center">
                        <input
                            type="number"
                            value={value === null || value === undefined ? '' : value}
                            onChange={e => setBonusData(name, parseFloat(e.target.value) || 0)}
                            onBlur={saveScenario}
                            disabled={!!onIconClick || isLocked}
                            className={`w-full text-sm border-gray-300 rounded px-2 py-1 text-right ${(!!onIconClick || isLocked) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                        />
                        <span className="ml-2 text-sm">%</span>
                    </div>
                ) : <div className="text-right px-2 text-sm">{value}%</div>}
            </td>
            <td className="px-6 py-2 border-r text-right font-mono text-gray-700">
                {(calculatedArea !== null ? calculatedArea : (baseVolume > 0 ? (baseVolume * value / 100) : 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
            </td>
            <td className={`px-6 py-2 text-sm ${isLocked ? 'text-red-500 italic font-bold' : 'text-gray-500'}`}>{note}</td>
        </tr>
    );
};

const ScenarioForm = () => {
    const {
        selectedProject,
        siteInputs, // [NEW] Use detached inputs
        updateProject,
        massingInputs, bonusData,
        addParcel, updateParcel,
        setMassingInput, setBonusData,
        // setCentralBonusDetail, setLocalBonusDetail, setDisasterBonusDetail, setBonusDetailStruct,
        initDraft, setBonusDetailsDraft, commitBonusDetails, discardDraft, draftBonusDetails,
        saveScenario, computedResult, updateSiteConfig, setMixedZonePolicy
    } = useProjectStore();

    // Local State for Modals & Forms
    const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
    const [activeBonusKey, setActiveBonusKey] = useState(null);
    const [editingParcelId, setEditingParcelId] = useState(null);
    const [newParcel, setNewParcel] = useState({
        district: '萬華區', section_name: '', lot_number: '', area_m2: '', zoning_type: '',
        announced_value: '', legal_coverage_rate: '45', legal_floor_area_rate: '225', road_width: '',
        tenure: '未確認', is_verified: false
    });

    // ... (Parcel Handlers)
    const handleParcelSubmit = (e) => {
        e.preventDefault();
        if (editingParcelId) {
            updateParcel(editingParcelId, newParcel);
        } else {
            addParcel(newParcel);
        }
        setIsParcelModalOpen(false);
        setEditingParcelId(null);
    };

    const handleZoneChange = (e) => {
        setNewParcel({ ...newParcel, zoning_type: e.target.value });
    };

    // Use centralized stats from computedResult to ensure Single Source of Truth
    const parcelSummary = computedResult?.siteStats || {
        count: 0,
        totalArea: 0,
        totalAllowedGFA: 0,
        maxBuildingArea: 0,
        maxGFA: 0,
        gfaDiff: 0,
        isDiffWarning: false
    };

    // Render Helpers
    if (!selectedProject) return <div className="p-8 text-center text-gray-400">Select a project to start</div>;

    const { baseVolume, siteArea } = computedResult || { baseVolume: 0, siteArea: 0 };
    const massingCalc = computedResult ? computedResult.massing : {
        massingMEArea: 0, massingStairArea: 0, massingBalconyArea: 0,
        massingGFA_Total: 0, estFloors: 0, estSingleFloorArea: 0, allowedVolumeArea: 0, saleableRatio: 0,
        usageAreas: { residential: 0, commercial: 0, agency: 0 }
    };



    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Land Parcels Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-700 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                        土地資料 Land Parcels
                    </h3>
                    <button onClick={() => { setEditingParcelId(null); setIsParcelModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"><Plus size={16} /> 新增地號</button>
                </div>
                {/* Parcel Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">In</th>
                                <th className="px-6 py-3">區段 (Location)</th>
                                <th className="px-6 py-3">地號 (Lot)</th>
                                <th className="px-6 py-3 text-right">面積 (m²)</th>
                                <th className="px-6 py-3">分區 (Zone)</th>
                                <th className="px-4 py-3 text-center">BCR%</th>
                                <th className="px-4 py-3 text-center">FAR%</th>
                                <th className="px-4 py-3">權屬 (Owner)</th>
                                <th className="px-4 py-3">風險 (Risk)</th>
                                <th className="px-6 py-3 text-right">允建容積 (MaxGFA)</th>
                                <th className="px-4 py-3 text-center">Opt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {selectedProject.land_parcels.map((parcel) => {
                                const stats = computedResult?.parcelStats?.find(p => p.id === String(parcel.id));
                                const hasWarning = stats?.warnings?.length > 0;
                                const maxGfaDisplay = stats?.maxGfa != null ? stats.maxGfa : (parcel.area_m2 * parcel.legal_floor_area_rate / 100);

                                return (
                                    <tr key={parcel.id} className={`hover:bg-blue-50 text-sm ${hasWarning ? 'bg-red-50' : ''}`}>
                                        <td className="px-4 py-3 text-center">
                                            <input type="checkbox" checked={parcel.includeInSite !== false} disabled className="text-blue-600 rounded" />
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-gray-700">{parcel.district}</div>
                                            <div className="text-xs text-gray-500">{parcel.section_name}</div>
                                        </td>
                                        <td className="px-6 py-3 font-mono">{parcel.lot_number}</td>
                                        <td className="px-6 py-3 font-mono text-right">{parcel.area_m2.toLocaleString()}</td>
                                        <td className="px-6 py-3">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs block w-fit">{parcel.zoning_type}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500 font-mono">
                                            {parcel.bcrLimit != null ? parcel.bcrLimit : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500 font-mono">
                                            {parcel.farLimit != null ? parcel.farLimit : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {OWNERSHIP_STATUS_OPTIONS.find(o => o.value === parcel.ownershipStatus)?.label || parcel.tenure || '未確認'}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {INTEGRATION_RISK_OPTIONS.find(o => o.value === parcel.integrationRisk)?.label || '-'}
                                        </td>
                                        <td className="px-6 py-3 font-mono text-right font-bold text-blue-700">
                                            {maxGfaDisplay.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => {
                                                    setEditingParcelId(parcel.id);
                                                    // Ensure modal state has latest data
                                                    setNewParcel({ ...parcel });
                                                    setIsParcelModalOpen(true);
                                                }}
                                                className="text-gray-400 hover:text-blue-600"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            {hasWarning && <span className="text-red-500 ml-2 animate-pulse" title={stats.warnings[0].msg}>⚠</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-gray-700 border-t-2 border-gray-200">
                            <tr>
                                <td colSpan={3} className="px-6 py-3 text-right">合計 (Total):</td>
                                <td className="px-6 py-3 text-right font-mono">{parcelSummary.totalArea.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                <td colSpan={3} className="px-6 py-3"></td>
                                <td className="px-6 py-3 text-right font-mono">{parcelSummary.totalAllowedGFA.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                <td className="px-6 py-3 text-center text-xs text-gray-500">{parcelSummary.count} 筆</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="flex gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg items-center justify-between shadow-sm flex-wrap">
                <div className="text-center min-w-[80px]">
                    <div className="text-sm text-gray-500 font-medium">總筆數</div>
                    <div className="text-xl font-bold text-gray-800">{parcelSummary.count}</div>
                </div>
                <div className="text-center min-w-[120px]">
                    <div className="text-sm text-gray-500 font-medium">總基地面積</div>
                    <div className="text-xl font-bold text-blue-700">{parcelSummary.totalArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</div>
                </div>

                {/* Zone Mix */}
                <div className="flex-1 px-4 border-l border-gray-200 min-w-[200px]">
                    <div className="text-sm text-gray-500 font-medium mb-1">分區佔比 (Zone Mix)</div>
                    <div className="text-sm font-bold text-gray-700 break-words">
                        {parcelSummary.zoneBreakdown ?
                            Object.values(parcelSummary.zoneBreakdown).map(z =>
                                `${z.zone} ${((z.totalArea / parcelSummary.totalArea) * 100).toFixed(0)}%`
                            ).join(' / ')
                            : '-'
                        }
                    </div>
                </div>

                {/* Computed Site Stats */}
                <div className="text-center border-l border-gray-200 pl-4 min-w-[140px]">
                    <div className="text-sm text-gray-400 font-medium">允建建築面積 (Max Footprint)</div>
                    <div className="text-lg font-mono text-gray-600">
                        {parcelSummary.maxBuildingArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                    </div>
                    <div className="text-xs text-gray-400">
                        {parcelSummary.totalArea > 0 ? `Avg BCR ${(parcelSummary.maxBuildingArea / parcelSummary.totalArea * 100).toFixed(1)}%` : ''}
                    </div>
                </div>

                <div className="text-center border-l border-gray-200 pl-4 min-w-[140px] relative">
                    <div className="text-sm text-gray-500 font-medium">允建總樓地板 (Max GFA)</div>
                    <div className={`text-xl font-bold ${parcelSummary.isDiffWarning ? 'text-red-500' : 'text-blue-700'}`}>
                        {parcelSummary.maxGFA.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                    </div>
                    <div className="text-xs text-gray-400">
                        {parcelSummary.totalArea > 0 ? `Avg FAR ${(parcelSummary.maxGFA / parcelSummary.totalArea * 100).toFixed(1)}%` : ''}
                    </div>
                    {parcelSummary.isDiffWarning && (
                        <div className="absolute top-0 right-0 -mt-2 -mr-2">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Site Calculation Settings (New) */}
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                <div className="p-4 border-b border-orange-100 bg-orange-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-700 border-l-4 border-orange-500 pl-3">
                        基地計算設定 (Site Calculation Settings)
                    </h3>
                    <div className="text-sm text-gray-500">
                        Selected: <span className="font-bold text-gray-800">{parcelSummary.count}</span> / {selectedProject.land_parcels.length} parcels
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    {/* Policy Selection */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-sm font-bold text-gray-700">混合分區檢討方式 (Mixed Zone Policy)</label>
                            {parcelSummary.count === 0 && (
                                <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                                    ⚠ 請先勾選地號 (select parcels first)
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {MIXED_ZONE_POLICY_OPTIONS.map(opt => {
                                const isActive = siteInputs?.mixedZonePolicy === opt.value;
                                const isDisabled = parcelSummary.count === 0;

                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => setMixedZonePolicy(opt.value)}
                                        className={`
                                            relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-all shadow-sm text-left
                                            ${isDisabled
                                                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                                : isActive
                                                    ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500 z-10'
                                                    : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-5 h-5 rounded-full border flex items-center justify-center
                                            ${isActive ? 'border-orange-500' : 'border-gray-300'}
                                        `}>
                                            {isActive && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                                        </div>
                                        <span className={`text-sm font-medium ${isActive ? 'text-orange-900' : 'text-gray-700'}`}>
                                            {opt.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mode B: Cap By Zone Extended Inputs */}
                    {siteInputs?.mixedZonePolicy === SITE_POLICY.CAP_BY_ZONE && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 space-y-4 animate-fadeIn">
                            <div className="flex items-center gap-2 text-sm text-orange-800 font-bold border-b border-orange-200 pb-2 mb-2">
                                <span>分區上限設定 (Cap Setting)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Residential Cap */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-600">住宅總量上限 (Res Cap GFA)</label>
                                        <span className="text-xs text-gray-400">Total Allowed</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={siteInputs?.allocation?.resCapGfa ?? ''}
                                            onChange={e => updateSiteConfig({
                                                allocation: { ...siteInputs?.allocation, resCapGfa: parseFloat(e.target.value) || 0 }
                                            })}
                                            className="w-full border border-gray-300 rounded p-2 text-right pr-8"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-400">m²</span>
                                    </div>
                                    {/* Planned Input */}
                                    <div className="flex justify-between mt-2">
                                        <label className="text-sm font-medium text-gray-600">計畫值 (Planned)</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={siteInputs?.allocation?.usePlan?.residentialGfaPlanned ?? ''}
                                            onChange={e => updateSiteConfig({
                                                allocation: {
                                                    ...siteInputs?.allocation,
                                                    usePlan: { ...siteInputs?.allocation?.usePlan, residentialGfaPlanned: parseFloat(e.target.value) || 0 }
                                                }
                                            })}
                                            className={`w-full border rounded p-2 text-right pr-8 ${(siteInputs?.allocation?.usePlan?.residentialGfaPlanned || 0) > (siteInputs?.allocation?.resCapGfa || 0)
                                                ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-400">m²</span>
                                    </div>
                                    {(siteInputs?.allocation?.usePlan?.residentialGfaPlanned || 0) > (siteInputs?.allocation?.resCapGfa || 0) && (
                                        <div className="text-xs text-red-600 font-bold">Planned exceeds Cap!</div>
                                    )}
                                </div>

                                {/* Commercial Cap */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-600">商業總量上限 (Com Cap GFA)</label>
                                        <span className="text-xs text-gray-400">Total Allowed</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={siteInputs?.allocation?.comCapGfa ?? ''}
                                            onChange={e => updateSiteConfig({
                                                allocation: { ...siteInputs?.allocation, comCapGfa: parseFloat(e.target.value) || 0 }
                                            })}
                                            className="w-full border border-gray-300 rounded p-2 text-right pr-8"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-400">m²</span>
                                    </div>
                                    {/* Planned Input */}
                                    <div className="flex justify-between mt-2">
                                        <label className="text-sm font-medium text-gray-600">計畫值 (Planned)</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={siteInputs?.allocation?.usePlan?.commercialGfaPlanned ?? ''}
                                            onChange={e => updateSiteConfig({
                                                allocation: {
                                                    ...siteInputs?.allocation,
                                                    usePlan: { ...siteInputs?.allocation?.usePlan, commercialGfaPlanned: parseFloat(e.target.value) || 0 }
                                                }
                                            })}
                                            className={`w-full border rounded p-2 text-right pr-8 ${(siteInputs?.allocation?.usePlan?.commercialGfaPlanned || 0) > (siteInputs?.allocation?.comCapGfa || 0)
                                                ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-400">m²</span>
                                    </div>
                                    {(siteInputs?.allocation?.usePlan?.commercialGfaPlanned || 0) > (siteInputs?.allocation?.comCapGfa || 0) && (
                                        <div className="text-xs text-red-600 font-bold">Planned exceeds Cap!</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Validations */}
                    {parcelSummary.validations && parcelSummary.validations.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 space-y-1">
                            {parcelSummary.validations.map((v, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span>⚠</span>
                                    <span>{v.msg}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Map */}
            <LandMap onAreaChange={() => { }} />

            {/* Bonus Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 h-16 flex items-center">
                    <h3 className="text-lg font-bold text-gray-700 border-l-4 border-yellow-500 pl-3">容積獎勵計算 (Volume Bonus)</h3>
                </div>
                <div className="p-6">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-left text-sm font-bold text-gray-600">
                                <th className="pb-3 pl-6">項目 (Item)</th>
                                <th className="pb-3 w-40">比值 (Ratio %)</th>
                                <th className="pb-3 text-right">面積 (Area m²)</th>
                                <th className="pb-3 pl-6">備註 (Note)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Render rows based on Schema/Constants or predefined list to ensure order */}
                            {/* We map specific keys to ensures UI order matches Vercel */}
                            {[
                                { key: 'bonus_central', label: '中央都更獎勵', hasDetails: true },
                                { key: 'bonus_local', label: '地方都更獎勵', hasDetails: true },
                                // [Fix] Use Canonical Key for Disaster Bonus to match Domain Loop
                                { key: 'bonus_other', label: '防災型都更獎勵', note: '包含高額獎勵', hasDetails: true },
                                { key: 'bonus_chloride', label: '高氯離子建物獎勵（海砂屋）', hasDetails: true },
                                { key: 'bonus_tod_reward', label: 'TOD 容積獎勵', hasDetails: true },
                                { key: 'bonus_tod_increment', label: '土管 80-2 容積獎勵', hasDetails: true },
                                { key: 'bonus_soil_mgmt', label: '廢土清理/其他', hasDetails: false }
                            ].map(row => {
                                // Determine lock status
                                const lockedItems = computedResult?.bonus?.lockedItems || [];
                                const isLocked = lockedItems.includes(row.key);

                                // Find calculated item from domain result
                                const domainItem = computedResult?.bonus?.items?.find(i => i.key === row.key);
                                const area = domainItem?.area || 0;

                                let status = null;
                                if (row.hasDetails && domainItem && typeof domainItem.isCompliant === 'boolean') {
                                    status = domainItem.isCompliant ? 'pass' : 'fail';
                                }

                                return (
                                    <RenderBonusRow
                                        status={isLocked ? 'locked' : status}
                                        key={row.key}
                                        label={row.label}
                                        name={row.key}
                                        value={isLocked ? 0 : bonusData[row.key]} // Force 0 display if locked
                                        calculatedArea={area}
                                        baseVolume={baseVolume}
                                        setBonusData={!isLocked ? setBonusData : () => { }} // No-op if locked
                                        saveScenario={!isLocked ? saveScenario : () => { }}
                                        note={isLocked ? '已鎖定 (互斥)' : row.note}
                                        icon={isLocked ? Lock : List} // Show Lock icon if locked
                                        // Disable click if locked
                                        onIconClick={(!isLocked && row.hasDetails) ? () => {
                                            initDraft(row.key);
                                            setActiveBonusKey(row.key);
                                        } : null}
                                        isDisabled={isLocked}
                                    />
                                );
                            })}

                            {/* Summary Rows */}
                            <tr className="bg-yellow-50 font-semibold border-t-2 border-yellow-100">
                                <td className="px-6 py-3">總申請獎勵額度 (Application Total)</td>
                                <td className="px-6 py-3 text-blue-700">
                                    {computedResult ? computedResult.bonus.applicationTotal.toFixed(2) : 0}%
                                </td>
                                <td className="px-6 py-3 text-right font-mono">
                                    {(baseVolume * (computedResult ? computedResult.bonus.applicationTotal : 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                                </td>
                                <td className="px-6 py-3 text-gray-500 text-xs">Sum of above inputs</td>
                            </tr>

                            {/* Cap Row */}
                            <RenderBonusRow
                                label="法定上限 (Statutory Cap)"
                                name="bonus_cap"
                                value={bonusData.bonus_cap}
                                baseVolume={baseVolume}
                                setBonusData={setBonusData}
                                saveScenario={saveScenario}
                                note="通常 50% 或 100%"
                                calculatedArea={null}
                            />

                            {/* Actual Row */}
                            <tr className="bg-green-50 font-bold border-t border-green-100">
                                <td className="px-6 py-3">實際核准獎勵 (Actual Check)</td>
                                <td className="px-6 py-3 text-green-700">
                                    {computedResult ? computedResult.bonus.actualBonus.toFixed(2) : 0}%
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-green-700">
                                    {(baseVolume * (computedResult ? computedResult.bonus.actualBonus : 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                                </td>
                                <td className="px-6 py-3 text-green-600 text-xs">Min(Application, Cap)</td>
                            </tr>

                            {/* Public Exemption */}
                            <RenderBonusRow
                                label="公益性免計容積 (Public Exemption)"
                                name="bonus_public_exemption"
                                value={bonusData.bonus_public_exemption}
                                baseVolume={baseVolume}
                                setBonusData={setBonusData}
                                saveScenario={saveScenario}
                                note="不計入上限 (Max 15%)"
                                calculatedArea={computedResult ? (baseVolume * (computedResult.bonus.publicExemption || 0) / 100) : 0}
                            />

                            {/* Grand Total */}
                            <tr className="bg-gray-800 text-white font-bold text-lg border-t-4 border-gray-600">
                                <td className="px-6 py-4">最終核准總容積 (Grand Total)</td>
                                <td className="px-6 py-4">
                                    {computedResult ? computedResult.bonus.totalAllowedRate.toFixed(2) : 100}%
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-yellow-300">
                                    {massingCalc.allowedVolumeArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                                </td>
                                <td className="px-6 py-4 text-gray-400 text-xs font-normal">Base + Actual + Tod Inc.</td>
                            </tr>
                        </tbody>
                    </table>
                </div >
            </div >

            {/* Massing Inputs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 h-16 flex items-center">
                    <h3 className="text-lg font-bold text-gray-700 border-l-4 border-purple-500 pl-3">建築開發量體初期評估 (Massing Assessment)</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* 1. Design Area & 2. Design Coverage */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">設計建築面積 (m²)</label>
                            <div className="w-full bg-gray-50 border p-2 rounded text-center text-gray-500">
                                {((siteArea || 0) * (massingInputs.design_coverage || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">設計建蔽率 (%)</label>
                            <input type="number" value={massingInputs.design_coverage} onChange={e => setMassingInput('design_coverage', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center" />
                        </div>

                        {/* 3. Exemption Coef & 4. Public Ratio */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">免計容積係數</label>
                            <input type="number" value={massingInputs.exemption_coef} onChange={e => setMassingInput('exemption_coef', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">公設比 (%)</label>
                            <input type="number" value={massingInputs.public_ratio} onChange={e => setMassingInput('public_ratio', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center" />
                        </div>

                        {/* 5. Stair % & 6. Stair Area */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">梯廳 (%)</label>
                            <input type="number" value={massingInputs.stair_rate} onChange={e => setMassingInput('stair_rate', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">梯廳面積 (m²)</label>
                            <div className="w-full bg-gray-50 border p-2 rounded text-center text-gray-500">
                                {massingCalc.massingStairArea.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </div>
                        </div>

                        {/* 7. M&E % & 8. M&E Area */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">機電/管委會 (%)</label>
                            <input type="number" value={massingInputs.me_rate} onChange={e => setMassingInput('me_rate', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">機電管委會面積 (m²)</label>
                            <div className="w-full bg-gray-50 border p-2 rounded text-center text-gray-500">
                                {massingCalc.massingMEArea.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </div>
                        </div>

                        {/* 9. Balcony % & 10. Balcony Area */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">陽台 (%)</label>
                            <input type="number" value={massingInputs.balcony_rate} onChange={e => setMassingInput('balcony_rate', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">陽台面積 (m²)</label>
                            <div className="w-full bg-gray-50 border p-2 rounded text-center text-gray-500">
                                {massingCalc.massingBalconyArea.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </div>
                        </div>
                    </div>

                    <h4 className="font-bold text-gray-600 mb-4 border-b pb-2">用途分配 (Usage Mix)</h4>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">住宅 (%)</label>
                            <input type="number" value={massingInputs.residential_rate} onChange={e => setMassingInput('residential_rate', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center mb-1" />
                            <div className="text-xs text-right text-gray-500">{massingCalc.usageAreas?.residential.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">商業 (%)</label>
                            <input type="number" value={massingInputs.commercial_rate} onChange={e => setMassingInput('commercial_rate', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center mb-1" />
                            <div className="text-xs text-right text-gray-500">{massingCalc.usageAreas?.commercial.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">辦公/機關 (%)</label>
                            <input type="number" value={massingInputs.agency_rate} onChange={e => setMassingInput('agency_rate', parseFloat(e.target.value))} onBlur={saveScenario} className="w-full border p-2 rounded text-center mb-1" />
                            <div className="text-xs text-right text-gray-500">{massingCalc.usageAreas?.agency.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</div>
                        </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">預估樓層數</div>
                            <div className="text-2xl font-bold text-purple-700">{massingCalc.estFloors}F</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">單層面積</div>
                            <div className="text-xl font-bold text-gray-800">{massingCalc.estSingleFloorArea.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">總樓地板面積 (GFA)</div>
                            <div className="text-xl font-bold text-blue-700">{massingCalc.massingGFA_Total.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                            <div className="text-xs text-gray-400">含公設</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">銷坪比 / 係數</div>
                            <div className="text-xl font-bold text-gray-600">{massingCalc.saleableRatio.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div >

            {/* Parcel Modal (Simplified) */}
            {
                isParcelModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                            <h3>{editingParcelId ? 'Edit' : 'Add'} Parcel</h3>
                            <form onSubmit={handleParcelSubmit} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">行政區 District</label>
                                        <select
                                            value={newParcel.district}
                                            onChange={e => setNewParcel({ ...newParcel, district: e.target.value })}
                                            className="w-full border p-2 rounded text-sm"
                                        >
                                            {['萬華區', '中正區', '信義區', '大安區', '松山區', '中山區', '大同區', '文山區', '南港區', '內湖區', '士林區', '北投區'].map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">使用分區 Zoning</label>
                                        <select
                                            value={newParcel.zoning_type}
                                            onChange={handleZoneChange}
                                            className="w-full border p-2 rounded text-sm"
                                        >
                                            <option value="">Select Zone</option>
                                            {Object.keys(ZONING_RATES).map(zone => (
                                                <option key={zone} value={zone}>{zone}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">段名 Section</label>
                                        <input
                                            placeholder="Section Name"
                                            value={newParcel.section_name}
                                            onChange={e => setNewParcel({ ...newParcel, section_name: e.target.value })}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">地號 Lot No.</label>
                                        <input
                                            placeholder="Lot Number"
                                            value={newParcel.lot_number}
                                            onChange={e => setNewParcel({ ...newParcel, lot_number: e.target.value })}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!newParcel.district || !newParcel.section_name || !newParcel.lot_number) {
                                            alert('請輸入完整地段號資料 (District, Section, Lot No.)');
                                            return;
                                        }
                                        try {
                                            const data = await fetchLandInfo(newParcel.district, newParcel.section_name, newParcel.lot_number);
                                            if (data) {
                                                setNewParcel(prev => ({
                                                    ...prev,
                                                    area_m2: parseFloat(data.area_m2) || 0,
                                                    announced_value: parseFloat(data.announced_value) || 0
                                                }));
                                            } else {
                                                alert('查無資料');
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert('Fetch failed: ' + err.message);
                                        }
                                    }}
                                    className="w-full bg-blue-50 text-blue-600 py-2 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2 text-sm"
                                >
                                    <List size={14} /> Auto Fetch Info
                                </button>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">面積 Area (m²)</label>
                                        <input
                                            type="number"
                                            value={newParcel.area_m2}
                                            onChange={e => setNewParcel({ ...newParcel, area_m2: parseFloat(e.target.value) || 0 })}
                                            className="w-full border p-2 rounded text-sm text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">公告現值 Value</label>
                                        <input
                                            type="number"
                                            value={newParcel.announced_value}
                                            onChange={e => setNewParcel({ ...newParcel, announced_value: parseFloat(e.target.value) || 0 })}
                                            className="w-full border p-2 rounded text-sm text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">權屬 Tenure</label>
                                        <select
                                            value={newParcel.ownershipStatus || newParcel.tenure} // Fallback for compat
                                            onChange={e => setNewParcel({ ...newParcel, ownershipStatus: e.target.value, tenure: e.target.options[e.target.selectedIndex].text })}
                                            className="w-full border p-2 rounded text-sm"
                                        >
                                            {OWNERSHIP_STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">整合風險 Risk</label>
                                        <select
                                            value={newParcel.integrationRisk || 'unknown'}
                                            onChange={e => setNewParcel({ ...newParcel, integrationRisk: e.target.value })}
                                            className="w-full border p-2 rounded text-sm"
                                        >
                                            {INTEGRATION_RISK_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Limits & Config */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">BCR Limit (%)</label>
                                        <input
                                            type="number"
                                            value={newParcel.bcrLimit ?? ''}
                                            onChange={e => setNewParcel({ ...newParcel, bcrLimit: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                            placeholder="Default"
                                            className="w-full border p-2 rounded text-sm text-right bg-yellow-50"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">FAR Limit (%)</label>
                                        <input
                                            type="number"
                                            value={newParcel.farLimit ?? ''}
                                            onChange={e => setNewParcel({ ...newParcel, farLimit: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                            placeholder="Default"
                                            className="w-full border p-2 rounded text-sm text-right bg-yellow-50"
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-4 grid grid-cols-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newParcel.includeInSite !== false} // Default true
                                            onChange={e => setNewParcel({ ...newParcel, includeInSite: e.target.checked })}
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <span className="text-sm font-bold text-gray-700">納入基地計算 (Include in Site)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer justify-end">
                                        <input
                                            type="checkbox"
                                            checked={!!newParcel.is_verified}
                                            onChange={e => setNewParcel({ ...newParcel, is_verified: e.target.checked })}
                                            className="w-4 h-4 text-green-600 rounded"
                                        />
                                        <span className="text-sm font-bold text-gray-700">已查驗 (Verified)</span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsParcelModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }

            {/* Generic Bonus Details Modal */}
            {
                activeBonusKey && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">
                                    {activeBonusKey === 'bonus_central' ? '中央都更獎勵明細' :
                                        activeBonusKey === 'bonus_local' ? '地方都更獎勵明細' :
                                            activeBonusKey === 'bonus_other' ? '防災型都更獎勵明細' :
                                                activeBonusKey === 'bonus_chloride' ? '高氯離子建物獎勵試算（海砂屋）' :
                                                    activeBonusKey === 'bonus_tod_reward' ? 'TOD獎勵明細' :
                                                        activeBonusKey === 'bonus_tod_increment' ? 'TOD增額容積明細' :
                                                            '獎勵明細 (Detail)'}
                                </h3>
                                <button onClick={() => setActiveBonusKey(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>

                            {/* Content Body */}
                            <div className="space-y-4">
                                {activeBonusKey === 'bonus_chloride' ? (
                                    /* Custom Modal for Chloride (Sea Sand House) */
                                    (() => {
                                        // 1. Read from Draft
                                        const details = draftBonusDetails || { checklist: {}, calculation_mode: 'original_ratio' };
                                        const checklist = details.checklist || {};

                                        // Local Helpers for Chloride Calculation (Compute from keys)
                                        const areaGround = checklist['area_ground'] || 0;
                                        const areaUnderground = checklist['area_underground'] || 0;
                                        const sumArea = areaGround + areaUnderground;
                                        const bonusArea = sumArea * 0.3;
                                        const bonusRate = baseVolume > 0 ? (bonusArea / baseVolume * 100) : 0;

                                        const updateChloride = (key, val) => {
                                            setBonusDetailsDraft({ checklist: { [key]: val } });
                                        };
                                        const updateMode = (mode) => {
                                            setBonusDetailsDraft({ calculation_mode: mode });
                                        };

                                        return (
                                            <div className="space-y-6">
                                                {/* Calculation Mode Radios */}
                                                <div className="bg-gray-50 p-4 rounded border">
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">計算方式</label>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="chloride_mode"
                                                                checked={details.calculation_mode === 'original_ratio'} // Default to first
                                                                onChange={() => updateMode('original_ratio')}
                                                                className="text-blue-600"
                                                            />
                                                            <span className="text-sm">依原容積率申請計算（A1 + B1） (Draft)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="chloride_mode"
                                                                checked={details.calculation_mode === 'original_total'}
                                                                onChange={() => updateMode('original_total')}
                                                                className="text-blue-600"
                                                            />
                                                            <span className="text-sm">依原總樓地板計算（A2 + B2）</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Input Fields */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">A1 地上層以上（申請）</label>
                                                        <div className="flex items-center">
                                                            <input
                                                                type="number"
                                                                value={areaGround || ''}
                                                                onChange={e => updateChloride('area_ground', parseFloat(e.target.value) || 0)}
                                                                className="w-full border p-2 rounded text-right"
                                                                placeholder="0"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-500">m²</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">B1 地下層（申請）</label>
                                                        <div className="flex items-center">
                                                            <input
                                                                type="number"
                                                                value={areaUnderground || ''}
                                                                onChange={e => updateChloride('area_underground', parseFloat(e.target.value) || 0)}
                                                                className="w-full border p-2 rounded text-right"
                                                                placeholder="0"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-500">m²</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Results Block (Computed from Draft) */}
                                                <div className="bg-blue-50 border border-blue-100 rounded p-4 space-y-3">
                                                    <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                                                        <span className="text-sm text-blue-800">原建築計畫基準容積（Sum）</span>
                                                        <span className="font-mono font-bold text-blue-900">{sumArea.toLocaleString()} m²</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                                                        <span className="text-sm text-blue-800">可爭取獎勵面積（30%）</span>
                                                        <span className="font-mono font-bold text-blue-900">{bonusArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-lg">
                                                        <span className="font-bold text-blue-800">相當於法定容積百分比</span>
                                                        <span className="font-mono font-bold text-blue-700">{bonusRate.toFixed(2)}%</span>
                                                    </div>
                                                </div>

                                                {/* Footer Actions Inline for Custom Modal */}
                                                <DetailModalFooter
                                                    onCancel={() => {
                                                        discardDraft();
                                                        setActiveBonusKey(null);
                                                    }}
                                                    onApply={() => {
                                                        // Update the main rate in bonusData is conceptually part of 'commit' or separate locally?
                                                        // Draft holds details. Commit updates store details + trigger computation.
                                                        // But `bonus_chloride` float value in `bonusData` also needs update.
                                                        // My store `commitDraft` does NOT update `bonusData` float, only `...Details`.
                                                        // Actually `computeScenario` re-calculates `bonusData` from `details`? 
                                                        // Wait, `computeScenario`. If not, we might need to manually set the float too.
                                                        // Assuming `commitBonusDetails` triggers computation which updates results.
                                                        // But `bonusData` inputs (the simple float map) might need manual sync if the computation logic relies on it.
                                                        // Let's assume for now we sync the float manually via `setBonusData` as before, OR `commitBonusDetails` handles it?
                                                        // The User logic was: Apply -> commit draft to store.
                                                        // Existing code was: `setBonusData(key, rate)`.
                                                        // If I use `commitBonusDetails`, `centralBonusDetails` updates.
                                                        // Does `computeScenario` use `centralBonusDetails` to overwrite `bonusData.bonus_central`?
                                                        // If NOT, we must also set the float.

                                                        // Best approach: Update the float value concurrently.
                                                        setBonusData('bonus_chloride', bonusRate);
                                                        commitBonusDetails('bonus_chloride');
                                                        setActiveBonusKey(null);
                                                    }}
                                                    onSave={() => {
                                                        setBonusData('bonus_chloride', bonusRate);
                                                        commitBonusDetails('bonus_chloride');
                                                        // Save is async, but we can fire and forget or await.
                                                        // `saveScenario` reads from store. We just updated store.
                                                        // We need to ensure setBonusData/commit updates happened first.
                                                        // Zustand setters are synchronous usually.
                                                        saveScenario();
                                                        setActiveBonusKey(null);
                                                    }}
                                                    isPass={true}
                                                    calculatedRate={bonusRate}
                                                />
                                            </div>
                                        );
                                    })()
                                ) : (activeBonusKey === 'bonus_other' || activeBonusKey === 'disaster_renewal_bonus_ratio') ? (
                                    /* --- DISASTER BONUS MODAL (Fixed) --- */
                                    (() => {
                                        // 1. Read from Draft
                                        const details = draftBonusDetails || {};
                                        const checklist = details.checklist || {};

                                        // Helper: Update with logging
                                        const updateDraft = (patch) => {
                                            const nextChecklist = { ...checklist, ...patch };
                                            // [Debug] Log draft changes
                                            console.log("[DisasterDraft] Update:", patch, "Next:", nextChecklist);
                                            setBonusDetailsDraft({ checklist: patch });
                                        };

                                        // 2. Extract Values (Standardized Keys)
                                        const mode = checklist.mode || 'standard';
                                        const isPlanApproved = !!checklist.is_plan_approved;
                                        // Handle number input safely: null for empty string
                                        const baseArea = checklist.base_area_m2;
                                        const hasRisk = !!checklist.has_risk_assessment;

                                        // 3. Validation Logic
                                        const missing = [];
                                        if (!isPlanApproved) missing.push("都市更新程序辦理 (Required)");
                                        if (baseArea === null || baseArea === undefined || baseArea < 1000) missing.push("基地規模 < 1000m²");
                                        if (!hasRisk) missing.push("危險建物評估 (Required)");

                                        const isValid = missing.length === 0;

                                        // 4. Calculate Rate
                                        const b1 = checklist.delta_b1 || 0;
                                        const b2 = checklist.delta_b2 || 0;
                                        const b3 = checklist.delta_b3 || 0;
                                        const sumRaw = b1 + b2 + b3;
                                        const cap = mode === 'standard' ? 30 : 100;
                                        const finalRate = Math.min(sumRaw, cap);

                                        // [Debug] Validation State
                                        console.log("[DisasterValidation]", { isValid, missing, finalRate, draft: checklist });

                                        return (
                                            <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-4">
                                                {/* Header / Mode */}
                                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                    <div className="font-bold text-gray-800 mb-2">獎勵模式 (Mode)</div>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={mode === 'standard'}
                                                                onChange={() => updateDraft({ mode: 'standard' })}
                                                                className="text-blue-600"
                                                            />
                                                            <span className="text-sm font-medium">一般情況 (Standard, Max 30%)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={mode === 'special'}
                                                                onChange={() => updateDraft({ mode: 'special' })}
                                                                className="text-red-600"
                                                            />
                                                            <span className="text-sm font-medium text-red-700">特殊放寬 (Special, Exclusive)</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Eligibility Gates */}
                                                <div className={`p-3 rounded border text-sm space-y-2 ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-100'}`}>
                                                    <div className={`font-bold border-b pb-1 ${isValid ? 'text-green-800 border-green-200' : 'text-red-800 border-red-200'}`}>
                                                        1. 適用門檻 (Gates) {isValid ? '✔ 通過' : '⚠ 未通過'}
                                                    </div>

                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isPlanApproved}
                                                            onChange={e => updateDraft({ is_plan_approved: e.target.checked })}
                                                        />
                                                        <span>1. 都市更新程序辦理</span>
                                                    </label>

                                                    <div className="flex items-center gap-2">
                                                        <span>2. 基地規模:</span>
                                                        <input
                                                            type="number"
                                                            value={baseArea ?? ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                updateDraft({ base_area_m2: val === '' ? null : parseFloat(val) });
                                                            }}
                                                            className="w-24 border rounded px-1 text-right"
                                                            placeholder="0"
                                                        />
                                                        <span>m² {(baseArea >= 1000) ? '✔' : '✘ (≥1000)'}</span>
                                                    </div>

                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={hasRisk}
                                                            onChange={e => updateDraft({ has_risk_assessment: e.target.checked })}
                                                        />
                                                        <span>3. 危險建物評估 (紅黃單/耐震不足)</span>
                                                    </label>
                                                </div>

                                                {/* B1-B3 Components */}
                                                <div className="space-y-2">
                                                    {['delta_b1', 'delta_b2', 'delta_b3'].map(key => {
                                                        const cfg = DISASTER_BONUS_ITEMS[key];
                                                        if (!cfg) return null;
                                                        return (
                                                            <div key={key} className="bg-white p-2 border rounded shadow-sm">
                                                                <div className="font-bold text-blue-800 text-sm mb-1">{cfg.title}</div>
                                                                <div className="flex flex-wrap gap-2 text-xs">
                                                                    {cfg.options.map(opt => (
                                                                        <label key={opt.label} className={`flex items-center gap-1 cursor-pointer p-1 rounded border ${checklist[key] === opt.value ? 'bg-blue-100 border-blue-300' : 'border-transparent'}`}>
                                                                            <input
                                                                                type="radio"
                                                                                name={key}
                                                                                checked={checklist[key] === opt.value}
                                                                                onChange={() => updateDraft({ [key]: opt.value })}
                                                                            />
                                                                            <span>{opt.label}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Exclusivity Warning */}
                                                {mode === 'special' && (
                                                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs text-yellow-800">
                                                        ⚠ 特殊模式說明: 此模式下獎勵上限放寬至 100%，但可能排它 (Exclusive)。
                                                    </div>
                                                )}

                                                <DetailModalFooter
                                                    onCancel={() => {
                                                        discardDraft();
                                                        setActiveBonusKey(null);
                                                    }}
                                                    onApply={() => {
                                                        // [Fix] Use Canonical Key 'bonus_other'
                                                        setBonusData('bonus_other', finalRate);
                                                        commitBonusDetails('bonus_other');
                                                        setActiveBonusKey(null);
                                                    }}
                                                    onSave={() => {
                                                        setBonusData('bonus_other', finalRate);
                                                        commitBonusDetails('bonus_other');
                                                        saveScenario();
                                                        setActiveBonusKey(null);
                                                    }}
                                                    isPass={isValid}
                                                    calculatedRate={finalRate}
                                                />
                                            </div>
                                        );
                                    })()
                                ) : activeBonusKey === 'bonus_tod_reward' ? (
                                    /* --- TOD REWARD BONUS MODAL (Fixed & Normalized) --- */
                                    (() => {
                                        try {
                                            // 1. Normalize & Verify
                                            // We use the full project draft state to ensure we have the latest
                                            const normalized = normalizeTodDetails({
                                                tod_increment_bonus_details: draftBonusDetails
                                            }, TOD_CONFIG);

                                            // 2. Debug Logging (Requirement A)
                                            console.log("[TOD_DEBUG] normalized:", normalized);
                                            console.log("[TOD_DEBUG] raw draft:", draftBonusDetails);
                                            console.log("[TOD_DEBUG] TOD_CONFIG stations:", TOD_CONFIG?.stations);

                                            // 3. Extract Values (Safe via Normalization)
                                            const checklist = normalized.checklist; // Normalized always returns valid nums

                                            const stationName = checklist.station_name || '';
                                            const zoneType = checklist.zone_type || '';

                                            // 4. Config Lookup (Safe)
                                            const stations = TOD_CONFIG?.stations || [];
                                            const stationCfg = stations.find(s => s.name === stationName);
                                            const zoneCfg = stationCfg?.zones?.find(z => z.type === zoneType);
                                            const cap = zoneCfg?.cap || 30;

                                            // 5. Calculation
                                            const d1 = checklist.d1_station_r;
                                            const d2 = checklist.d2_transfer_r;
                                            const d3 = checklist.d3_scale_r;
                                            const d4 = checklist.d4_design_r;
                                            const d5 = checklist.d5_park_r;
                                            const sumRate = d1 + d2 + d3 + d4 + d5;
                                            // fmtFixed is imported or defined locally (we will reuse the one we defined)

                                            const finalRate = Math.min(sumRate, cap);
                                            const isOverCap = sumRate > cap;

                                            const updateTOD = (key, val) => {
                                                setBonusDetailsDraft({ checklist: { ...checklist, [key]: val } });
                                            };

                                            return (
                                                <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-4">
                                                    <div className="bg-blue-50 p-3 rounded border border-blue-200 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">捷運站點 (Station)</label>
                                                            <select value={stationName} onChange={e => updateTOD('station_name', e.target.value)} className="w-full border p-1 rounded">
                                                                <option value="">選擇站點</option>
                                                                {stations.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">範圍 (Zone)</label>
                                                            <select value={zoneType} onChange={e => updateTOD('zone_type', e.target.value)} className="w-full border p-1 rounded">
                                                                <option value="">選擇範圍</option>
                                                                {stationCfg?.zones?.map(z => <option key={z.type} value={z.type}>{z.type} (Cap: {z.cap}%)</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {[
                                                            { k: 'd1_station_r', label: 'D1 站點貢獻', max: 10 },
                                                            { k: 'd2_transfer_r', label: 'D2 轉乘機能', max: 5 },
                                                            { k: 'd3_scale_r', label: 'D3 規模獎勵', max: 10 },
                                                            { k: 'd4_design_r', label: 'D4 設計獎勵', max: 10 },
                                                            { k: 'd5_park_r', label: 'D5 公益/停車', max: 15 },
                                                        ].map(f => (
                                                            <div key={f.k} className="flex justify-between items-center border-b pb-1">
                                                                <label className="text-sm text-gray-700">{f.label}</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={checklist[f.k] || ''}
                                                                        onChange={e => updateTOD(f.k, parseFloat(e.target.value) || 0)}
                                                                        className="w-20 border rounded px-1 text-right"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="text-xs text-gray-500 w-8">Max {f.max}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end gap-2 text-sm text-gray-600">
                                                        <span>累計: {fmtFixed(sumRate, 2)}%</span>
                                                        <span className={isOverCap ? 'text-red-500 font-bold' : ''}>
                                                            (上限: {cap}%)
                                                        </span>
                                                    </div>

                                                    <DetailModalFooter
                                                        onCancel={() => {
                                                            discardDraft();
                                                            setActiveBonusKey(null);
                                                        }}
                                                        onApply={() => {
                                                            setBonusData('bonus_tod_reward', finalRate);
                                                            commitBonusDetails('bonus_tod_reward');
                                                            setActiveBonusKey(null);
                                                        }}
                                                        onSave={() => {
                                                            setBonusData('bonus_tod_reward', finalRate);
                                                            commitBonusDetails('bonus_tod_reward');
                                                            saveScenario();
                                                            setActiveBonusKey(null);
                                                        }}
                                                        isPass={!!stationName && !!zoneType}
                                                        calculatedRate={finalRate}
                                                        cap={cap}
                                                        isOverCap={isOverCap}
                                                    />
                                                </div>
                                            );
                                        } catch (error) {
                                            console.error("[SafeRender] TOD Modal Error:", error, {
                                                activeKey: activeBonusKey,
                                                draft: draftBonusDetails
                                            });
                                            return (
                                                <div className="p-6 text-center text-red-500">
                                                    <p className="font-bold">Data Display Error</p>
                                                    <p className="text-sm text-gray-400 mt-2">請聯繫管理員 (Ref: {error.message})</p>
                                                    <button
                                                        onClick={() => setActiveBonusKey(null)}
                                                        className="mt-4 px-4 py-2 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                                                    >
                                                        關閉 (Close)
                                                    </button>
                                                </div>
                                            );
                                        }
                                    })()
                                ) : (
                                    /* --- GENERIC MODAL (Dynamic Form) Central / Local / TOD Increment / Soil --- */
                                    (() => {
                                        try {
                                            // 1. Determine Bonus Items Config
                                            let configItems = {};
                                            if (activeBonusKey === 'bonus_central') configItems = CENTRAL_BONUS_ITEMS;
                                            else if (activeBonusKey === 'bonus_local') configItems = LOCAL_BONUS_ITEMS;
                                            else if (activeBonusKey === 'bonus_tod_reward') configItems = TOD_BONUS_ITEMS;
                                            else if (activeBonusKey === 'bonus_tod_increment') configItems = TOD_INCREMENT_ITEMS;

                                            // Empty State Check
                                            if (!configItems || Object.keys(configItems).length === 0) {
                                                return <div className="p-8 text-center text-gray-400">尚無此項目的詳細設定 (No Configuration)</div>;
                                            }

                                            // 2. Read from Draft
                                            const details = draftBonusDetails || {};
                                            const currentChecklist = details.checklist || {};

                                            // 3. Render Fields
                                            const formParams = Object.entries(configItems).map(([key, cfg]) => (
                                                <div key={key} className="p-3 bg-gray-50 rounded border border-gray-100">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-gray-700 text-sm">{cfg.label}</span>
                                                        <span className={`text-xs font-mono ${typeof cfg.value === 'number' ? 'text-blue-600' : 'text-gray-500'}`}>
                                                            {typeof cfg.value === 'number'
                                                                ? `${cfg.value}%`
                                                                : (currentChecklist[key] > 0 ? `${currentChecklist[key]}%` : 'Variable')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-2">{cfg.description}</p>

                                                    {cfg.type === 'boolean' ? (
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!currentChecklist[key]}
                                                                onChange={e => setBonusDetailsDraft({ checklist: { [key]: e.target.checked } })}
                                                                className="w-4 h-4 text-blue-600 rounded"
                                                            />
                                                            <span className="text-sm">符合此項目 (Enabled)</span>
                                                        </label>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={currentChecklist[key] || ''}
                                                                onChange={e => setBonusDetailsDraft({ checklist: { [key]: parseFloat(e.target.value) || 0 } })}
                                                                className="border rounded px-2 py-1 text-sm w-full"
                                                                placeholder="輸入數值..."
                                                            />
                                                            {cfg.max && <span className="text-xs text-gray-400 whitespace-nowrap">Max {cfg.max}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ));

                                            // 4. Calculation & Validation
                                            const isPass = Object.entries(configItems).every(([k, cfg]) => {
                                                if (!cfg.required) return true;
                                                const val = currentChecklist[k];
                                                return val === true || (typeof val === 'number' && val > 0);
                                            });

                                            const calculatedRate = Object.entries(configItems).reduce((sum, [k, cfg]) => {
                                                const val = currentChecklist[k];
                                                if (typeof val === 'number') return sum + val;
                                                if (val === true && typeof cfg.value === 'number') return sum + cfg.value;
                                                return sum;
                                            }, 0);

                                            return (
                                                <div className="flex flex-col h-full">
                                                    <div className="flex-1 space-y-3 p-1 overflow-y-auto max-h-[60vh]">
                                                        {formParams}
                                                    </div>

                                                    <DetailModalFooter
                                                        onCancel={() => {
                                                            discardDraft();
                                                            setActiveBonusKey(null);
                                                        }}
                                                        onApply={() => {
                                                            setBonusData(activeBonusKey, calculatedRate);
                                                            commitBonusDetails(activeBonusKey);
                                                            setActiveBonusKey(null);
                                                        }}
                                                        onSave={() => {
                                                            setBonusData(activeBonusKey, calculatedRate);
                                                            commitBonusDetails(activeBonusKey);
                                                            saveScenario();
                                                            setActiveBonusKey(null);
                                                        }}
                                                        isPass={isPass}
                                                        calculatedRate={calculatedRate}
                                                    />
                                                </div>
                                            );
                                        } catch (error) {
                                            console.error("[SafeRender] Bonus Modal Error:", error);
                                            return (
                                                <div className="p-6 text-center text-red-500">
                                                    <p className="font-bold">資料無法顯示 (Render Error)</p>
                                                    <p className="text-sm text-gray-400 mt-2">請聯繫管理員或嘗試重新整理 (Ref: {error.message})</p>
                                                    <button
                                                        onClick={() => setActiveBonusKey(null)}
                                                        className="mt-4 px-4 py-2 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                                                    >
                                                        關閉 (Close)
                                                    </button>
                                                </div>
                                            );
                                        }
                                    })()
                                )
                                }
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default ScenarioForm;
